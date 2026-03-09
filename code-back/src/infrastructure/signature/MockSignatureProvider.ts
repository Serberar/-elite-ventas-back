import { randomUUID } from 'crypto';
import {
  ISignatureProvider,
  SignatureMetadata,
  SendDocumentResult,
  DocumentStatusResult,
} from '@domain/services/ISignatureProvider';
import logger from '@infrastructure/observability/logger/logger';

export class MockSignatureProvider implements ISignatureProvider {
  async sendDocument(
    pdf: Buffer,
    signerEmail: string,
    metadata: SignatureMetadata
  ): Promise<SendDocumentResult> {
    const documentId = randomUUID();

    logger.info('[MOCK] Contrato enviado (simulado)', {
      documentId,
      signerEmail,
      saleId: metadata.saleId,
      clientName: metadata.clientName,
      pdfSizeBytes: pdf.length,
    });

    return { documentId };
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatusResult> {
    logger.debug('[MOCK] Consultando estado de documento', { documentId });
    return { status: 'pending' };
  }

  async cancelDocument(documentId: string): Promise<void> {
    logger.info('[MOCK] Documento cancelado (simulado)', { documentId });
  }
}
