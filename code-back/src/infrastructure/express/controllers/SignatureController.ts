import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { LleidaSignatureProvider } from '@infrastructure/signature/LleidaSignatureProvider';
import { AuthenticationError } from '@application/shared/AppError';
import logger from '@infrastructure/observability/logger/logger';

const RECORDS_DIR = process.env.RECORDS_PATH || './records';

export class SignatureController {
  // POST /api/sales/:saleId/signature/send
  static async sendContract(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const { signerEmail, signerPhone, deliveryMethod, templateId } = req.body;

      const signatureRequest = await serviceContainer.generateAndSendContractUseCase.execute(
        { saleId, signerEmail: signerEmail ?? '', signerPhone, deliveryMethod, templateId },
        currentUser
      );

      res.status(201).json({
        message: 'Contrato enviado al firmante correctamente',
        signatureRequest: signatureRequest.toPrisma(),
      });
    } catch (error) {
      logger.error('[Signature] Error en sendContract', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
      next(error);
    }
  }

  // POST /api/sales/:saleId/signature/resend
  static async resendContract(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;
      const { signerEmail } = req.body;

      const signatureRequest = await serviceContainer.resendSignatureRequestUseCase.execute(
        { saleId, signerEmail },
        currentUser
      );

      res.status(200).json({
        message: 'Contrato reenviado correctamente',
        signatureRequest: signatureRequest.toPrisma(),
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/sales/:saleId/signature
  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;

      const signatureRequest = await serviceContainer.getSignatureStatusUseCase.execute(
        saleId,
        currentUser
      );

      res.status(200).json(signatureRequest ? signatureRequest.toPrisma() : null);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/sales/:saleId/signature
  static async cancelSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;

      await serviceContainer.cancelSignatureRequestUseCase.execute(saleId, currentUser);

      res.status(200).json({ message: 'Solicitud de firma cancelada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/signature/webhook
  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerDocumentId, event, signedUrl, rejectionReason } = req.body;

      const signatureRequest = await serviceContainer.handleSignatureWebhookUseCase.execute({
        providerDocumentId,
        event,
        signedUrl,
        rejectionReason,
      });

      res.status(200).json({
        message: 'Webhook procesado correctamente',
        signatureRequest: signatureRequest.toPrisma(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/signature/lleida-callback
   * Recibe notificaciones de Lleida.net Click & Sign en formato
   * application/x-www-form-urlencoded:
   *   signature_id, contract_id, status, status_date
   */
  static async handleLleidaCallback(req: Request, res: Response, _next: NextFunction) {
    // Responder 200 inmediatamente para evitar reintentos de Lleida.net
    res.status(200).end();

    const { signature_id, contract_id, status, status_date } = req.body;

    logger.info('[Lleida] Callback recibido', { signature_id, contract_id, status, status_date });

    try {
      const providerDocumentId = String(signature_id);

      // Flujo independiente: evidencia lista para descargar
      if (status === 'evidence_generated' || status === 'stamp_generated') {
        await SignatureController.handleEvidenceReady(providerDocumentId);
        return;
      }

      // Flujo normal: firma completada o rechazada
      const event = LleidaSignatureProvider.mapStatus(status);
      if (!event) {
        logger.debug('[Lleida] Status intermedio ignorado', { signature_id, status });
        return;
      }

      let evidencePath: string | undefined;
      if (event === 'signed') {
        evidencePath = await SignatureController.tryDownloadEvidence(providerDocumentId);
      }

      await serviceContainer.handleSignatureWebhookUseCase.execute({
        providerDocumentId,
        event,
        signedUrl: evidencePath,
      });

      logger.info('[Lleida] Callback de firma procesado', { signature_id, event, evidencePath });
    } catch (error) {
      logger.error('[Lleida] Error procesando callback', error as Error, {
        signature_id,
        status,
      });
    }
  }

  /**
   * Descarga la evidencia cuando Lleida.net notifica evidence_generated.
   * Guarda el PDF en disco, actualiza signedDocumentUrl y añade al historial.
   */
  private static async handleEvidenceReady(signatureId: string): Promise<void> {
    try {
      const evidencePath = await SignatureController.tryDownloadEvidence(signatureId);
      if (!evidencePath) {
        logger.debug('[Lleida] Evidencia no disponible todavía', { signatureId });
        return;
      }

      const sigReq = await serviceContainer.signatureRequestRepository.findByProviderDocumentId(signatureId);
      if (!sigReq) return;

      await serviceContainer.signatureRequestRepository.update(sigReq.id, {
        signedDocumentUrl: evidencePath,
      });

      await serviceContainer.saleRepository.addHistory({
        saleId: sigReq.saleId,
        userId: undefined,
        action: 'evidence_downloaded',
        payload: { signatureId },
      });

      logger.info('[Lleida] Evidencia registrada correctamente', { signatureId, evidencePath });
    } catch (error) {
      logger.error('[Lleida] Error procesando evidence_generated', error as Error, { signatureId });
    }
  }

  /**
   * Descarga la evidencia de Lleida.net y la guarda en disco.
   * Devuelve la ruta relativa del archivo guardado, o undefined si falla.
   */
  private static async tryDownloadEvidence(signatureId: string): Promise<string | undefined> {
    try {
      // Buscar la venta asociada para saber la carpeta de destino
      const sigReq = await serviceContainer.signatureRequestRepository.findByProviderDocumentId(signatureId);
      if (!sigReq) {
        logger.debug('[Lleida] No se encontró solicitud de firma para descargar evidencia', { signatureId });
        return undefined;
      }

      const evidenceBuffer = await serviceContainer.lleidaSignatureProvider.downloadEvidence(signatureId);
      if (!evidenceBuffer) return undefined;

      // Guardar en records/{saleId}/evidence_{signatureId}.pdf
      const saleDir = path.join(RECORDS_DIR, sigReq.saleId);
      fs.mkdirSync(saleDir, { recursive: true });

      const filename = `evidence_${signatureId}.pdf`;
      const filePath = path.join(saleDir, filename);
      fs.writeFileSync(filePath, evidenceBuffer);

      // Retornar ruta relativa (como la usan los recordings)
      const relativePath = path.join(sigReq.saleId, filename);
      logger.info('[Lleida] Evidencia guardada en disco', { relativePath });
      return relativePath;
    } catch (error) {
      logger.error('[Lleida] Error guardando evidencia en disco', error as Error, { signatureId });
      return undefined;
    }
  }

  /**
   * POST /api/sales/:saleId/signature/evidence/fetch
   * Descarga la evidencia manualmente desde Lleida.net y la almacena.
   * Útil como fallback si el callback automático falló o el archivo se perdió.
   */
  static async fetchEvidenceFromProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;

      const sigReq = await serviceContainer.signatureRequestRepository.findBySaleId(saleId);
      if (!sigReq || !sigReq.providerDocumentId) {
        return res.status(404).json({ message: 'No hay solicitud de firma para esta venta' });
      }
      if (sigReq.status !== 'signed') {
        return res.status(400).json({ message: 'El contrato aún no está firmado' });
      }

      const evidencePath = await SignatureController.tryDownloadEvidence(sigReq.providerDocumentId);
      if (!evidencePath) {
        return res.status(404).json({ message: 'La evidencia no está disponible en Lleida.net todavía' });
      }

      await serviceContainer.signatureRequestRepository.update(sigReq.id, {
        signedDocumentUrl: evidencePath,
      });

      await serviceContainer.saleRepository.addHistory({
        saleId,
        userId: currentUser.id,
        action: 'evidence_downloaded',
        payload: { signatureId: sigReq.providerDocumentId, manual: true },
      });

      logger.info('[Lleida] Evidencia descargada manualmente', { saleId, evidencePath });
      res.json({ message: 'Evidencia descargada y almacenada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/sales/:saleId/signature/evidence
   * Sirve el PDF de evidencia de la firma desde disco.
   */
  static async getEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const currentUser = req.user;
      if (!currentUser) throw new AuthenticationError('No autorizado');

      const { saleId } = req.params as Record<string, string>;

      const sigReq = await serviceContainer.signatureRequestRepository.findBySaleId(saleId);
      if (!sigReq || sigReq.status !== 'signed' || !sigReq.signedDocumentUrl) {
        return res.status(404).json({ message: 'Evidencia de firma no disponible' });
      }

      // signedDocumentUrl almacena la ruta relativa dentro de RECORDS_DIR
      const resolvedRecordsDir = path.resolve(RECORDS_DIR);
      const filePath = path.resolve(RECORDS_DIR, sigReq.signedDocumentUrl);

      // Prevenir path traversal
      if (!filePath.startsWith(resolvedRecordsDir + path.sep)) {
        return res.status(403).json({ message: 'Acceso denegado' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Archivo de evidencia no encontrado en disco' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="evidencia_firma_${saleId}.pdf"`);
      return res.download(filePath, `evidencia_firma_${saleId}.pdf`);
    } catch (error) {
      next(error);
    }
  }
}
