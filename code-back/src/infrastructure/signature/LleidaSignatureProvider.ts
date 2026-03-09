import axios from 'axios';
import {
  ISignatureProvider,
  SignatureMetadata,
  SendDocumentResult,
  DocumentStatusResult,
} from '@domain/services/ISignatureProvider';
import logger from '@infrastructure/observability/logger/logger';

const LLEIDA_BASE_URL = 'https://api.lleida.net/cs/v1';

/** Statuses que Lleida.net considera como proceso firmado con éxito */
const SIGNED_STATUSES = new Set(['signed', 'end_ok', 'evidence_generated']);

/** Statuses que Lleida.net considera como proceso finalizado sin firma */
const REJECTED_STATUSES = new Set([
  'declined',
  'end_ko',
  'cancelled',
  'expired',
  'failed',
  'max_otp',
  'max_access',
]);

export class LleidaSignatureProvider implements ISignatureProvider {
  private readonly apiKey: string;
  private readonly user: string;
  private readonly configId: number;
  private readonly configIdSms: number;

  constructor(apiKey: string, user: string, configId: number, configIdSms?: number) {
    this.apiKey = apiKey;
    this.user = user;
    this.configId = configId;
    this.configIdSms = configIdSms ?? configId;
  }

  private get headers() {
    return {
      Authorization: `x-api-key ${this.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    };
  }

  async sendDocument(
    pdf: Buffer,
    signerEmail: string,
    metadata: SignatureMetadata
  ): Promise<SendDocumentResult> {
    const base64Pdf = pdf.toString('base64');

    // Separar nombre y apellido del cliente
    const nameParts = (metadata.clientName || '').trim().split(' ');
    const name = nameParts[0] || '';
    const surname = nameParts.slice(1).join(' ') || '';

    const isSms = metadata.deliveryMethod === 'sms';
    const selectedConfigId = isSms ? this.configIdSms : this.configId;

    const signatory: Record<string, string> = { name, surname };
    if (isSms && metadata.signerPhone) {
      signatory.phone = LleidaSignatureProvider.normalizePhone(metadata.signerPhone);
      // Incluir email también si está disponible (recomendado por la doc de Lleida.net)
      if (signerEmail) signatory.email = signerEmail;
    } else {
      signatory.email = signerEmail;
    }

    const body = {
      request: 'START_SIGNATURE',
      request_id: metadata.saleId,
      user: this.user,
      signature: {
        config_id: selectedConfigId,
        contract_id: metadata.saleId,
        level: [
          {
            level_order: 0,
            signatories: [signatory],
          },
        ],
        file: [
          {
            filename: 'contrato.pdf',
            content: base64Pdf,
            file_group: 'contract_files',
          },
        ],
      },
    };

    logger.info('[Lleida] Iniciando proceso de firma', {
      saleId: metadata.saleId,
      deliveryMethod: metadata.deliveryMethod ?? 'email',
      signerEmail: signatory.email,
      signerPhone: signatory.phone,
    });

    let response;
    try {
      response = await axios.post(`${LLEIDA_BASE_URL}/start_signature`, body, {
        headers: this.headers,
      });
    } catch (err: any) {
      const lleidaError = err?.response?.data;
      logger.error('[Lleida] Error en start_signature', {
        status: err?.response?.status,
        data: lleidaError,
        saleId: metadata.saleId,
      });
      throw new Error(
        `Lleida.net rechazó la solicitud: ${JSON.stringify(lleidaError ?? err?.message)}`
      );
    }

    const data = response.data as any;
    const signatureId = data?.signature?.signature_id;

    if (!signatureId) {
      throw new Error(
        `Lleida.net no devolvió signature_id. Código: ${data?.code}, Status: ${data?.status} | phone="${signatory.phone ?? ''}" email="${signatory.email ?? ''}"`
      );
    }

    logger.info('[Lleida] Proceso de firma iniciado', {
      saleId: metadata.saleId,
      signatureId,
    });

    return { documentId: String(signatureId) };
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    const body = {
      request: 'GET_SIGNATURE_STATUS',
      request_id: documentId,
      user: this.user,
      signature_id: documentId,
    };

    const response = await axios.post(`${LLEIDA_BASE_URL}/get_signature_status`, body, {
      headers: this.headers,
    });

    const signatureStatus: string = (response.data as any)?.signature_status || '';

    logger.debug('[Lleida] Estado de firma consultado', { documentId, signatureStatus });

    if (SIGNED_STATUSES.has(signatureStatus)) {
      return { status: 'signed' };
    }
    if (REJECTED_STATUSES.has(signatureStatus)) {
      return { status: 'rejected' };
    }
    return { status: 'pending' };
  }

  async cancelDocument(documentId: string): Promise<void> {
    const body = {
      request: 'CANCEL_SIGNATURE',
      request_id: documentId,
      user: this.user,
      signature_id: documentId,
    };

    await axios.post(`${LLEIDA_BASE_URL}/cancel_signature`, body, {
      headers: this.headers,
    });

    logger.info('[Lleida] Proceso de firma cancelado', { documentId });
  }

  /**
   * Descarga la evidencia del proceso de firma (PDF con pruebas) desde Lleida.net.
   * Usa el grupo SIGNATORY_EVIDENCE que contiene el PDF de evidencia con sello.
   * Retorna el contenido en Buffer, o null si no está disponible todavía.
   */
  async downloadEvidence(signatureId: string): Promise<Buffer | null> {
    const body = {
      request: 'GET_DOCUMENT',
      request_id: signatureId,
      user: this.user,
      signature_id: signatureId,
      file_group: 'SIGNATORY_EVIDENCE',
    };

    try {
      const response = await axios.post(`${LLEIDA_BASE_URL}/get_document`, body, {
        headers: this.headers,
      });

      const resData = response.data as any;
      const files = resData?.document?.file;
      if (!files || files.length === 0) {
        logger.debug('[Lleida] Sin archivos de evidencia disponibles', { signatureId });
        return null;
      }

      // Tomar el primer archivo de evidencia
      const evidenceFile = files[0];
      const content: string | undefined = evidenceFile?.content;

      if (!content) {
        logger.debug('[Lleida] Archivo de evidencia sin contenido base64', { signatureId });
        return null;
      }

      logger.info('[Lleida] Evidencia descargada correctamente', { signatureId });
      return Buffer.from(content, 'base64');
    } catch (error) {
      logger.error('[Lleida] Error descargando evidencia', error as Error, { signatureId });
      return null;
    }
  }

  /**
   * Mapea un status de Lleida.net a nuestro evento de webhook interno.
   * Retorna null si el status no es terminal (no se debe procesar).
   */
  static mapStatus(lleidaStatus: string): 'signed' | 'rejected' | null {
    if (SIGNED_STATUSES.has(lleidaStatus)) return 'signed';
    if (REJECTED_STATUSES.has(lleidaStatus)) return 'rejected';
    return null;
  }

  /**
   * Normaliza un número de teléfono asegurando el prefijo internacional +34.
   * - Si ya empieza por '+' → lo deja tal cual
   * - Si empieza por '34' → añade el '+'
   * - En cualquier otro caso → añade '+34'
   */
  static normalizePhone(phone: string): string {
    const trimmed = phone.trim();
    // Conservar el '+' inicial si existe, luego extraer solo dígitos
    const hasPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    if (hasPlus) return `+${digits}`;
    if (digits.startsWith('34')) return `+${digits}`;
    return `+34${digits}`;
  }
}
