import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { NotFoundError, ValidationError } from '@application/shared/AppError';
import logger from '@infrastructure/observability/logger/logger';

export interface WebhookPayload {
  providerDocumentId: string;
  event: 'signed' | 'rejected';
  signedUrl?: string;
  rejectionReason?: string;
}

export class HandleSignatureWebhookUseCase {
  constructor(
    private signatureRepo: ISignatureRequestRepository,
    private saleRepo: ISaleRepository,
    private saleStatusRepo?: ISaleStatusRepository
  ) {}

  async execute(payload: WebhookPayload): Promise<SignatureRequest> {
    if (!payload.providerDocumentId) {
      throw new ValidationError('El campo providerDocumentId es obligatorio');
    }

    const signatureRequest = await this.signatureRepo.findByProviderDocumentId(
      payload.providerDocumentId
    );

    if (!signatureRequest) {
      throw new NotFoundError('SolicitudFirma', payload.providerDocumentId);
    }

    if (signatureRequest.status === 'signed') {
      throw new ValidationError('El contrato ya estaba marcado como firmado');
    }

    let updated: SignatureRequest;

    if (payload.event === 'signed') {
      updated = await this.signatureRepo.update(signatureRequest.id, {
        status: 'signed',
        signedAt: new Date(),
        signedDocumentUrl: payload.signedUrl ?? null,
      });

      await this.saleRepo.addHistory({
        saleId: signatureRequest.saleId,
        userId: undefined,
        action: 'signature_completed',
        payload: {
          providerDocumentId: payload.providerDocumentId,
          signedUrl: payload.signedUrl ?? null,
        },
      });

      if (signatureRequest.documentType === 'contract') {
        await this.autoChangeSaleStatusToFirmada(signatureRequest.saleId);
      }
    } else if (payload.event === 'rejected') {
      updated = await this.signatureRepo.update(signatureRequest.id, {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: payload.rejectionReason ?? null,
      });

      await this.saleRepo.addHistory({
        saleId: signatureRequest.saleId,
        userId: undefined,
        action: 'signature_rejected',
        payload: {
          providerDocumentId: payload.providerDocumentId,
          rejectionReason: payload.rejectionReason ?? null,
        },
      });
    } else {
      throw new ValidationError(`Evento de webhook desconocido: ${payload.event}`);
    }

    return updated;
  }

  /**
   * Cambia automáticamente el estado de la venta a "Firmada" (o el primer estado
   * final no cancelado) cuando la firma se completa con éxito.
   */
  private async autoChangeSaleStatusToFirmada(saleId: string): Promise<void> {
    if (!this.saleStatusRepo) return;

    try {
      const sale = await this.saleRepo.findById(saleId);
      if (!sale) return;

      const allStatuses = await this.saleStatusRepo.list(sale.empresaId);
      const firmadaStatus =
        allStatuses.find((s) => s.name === 'Firmada') ??
        allStatuses.find((s) => s.isFinal && !s.isCancelled);

      if (!firmadaStatus) {
        logger.warn('[Webhook] No se encontró estado "Firmada" para cambio automático', { saleId });
        return;
      }

      if (sale.statusId === firmadaStatus.id) return;

      const previousStatus = allStatuses.find((s) => s.id === sale.statusId);

      await this.saleRepo.update(saleId, {
        statusId: firmadaStatus.id,
        closedAt: new Date(),
      });

      await this.saleRepo.addHistory({
        saleId,
        userId: undefined,
        action: 'change_status',
        payload: {
          from: sale.statusId,
          fromName: previousStatus?.name ?? null,
          to: firmadaStatus.id,
          toName: firmadaStatus.name,
          comment: 'Cambio automático por firma del contrato',
        },
      });

      logger.info('[Webhook] Estado de venta cambiado automáticamente a Firmada', {
        saleId,
        fromStatus: previousStatus?.name,
        toStatus: firmadaStatus.name,
      });
    } catch (error) {
      logger.error('[Webhook] Error al cambiar estado automáticamente', error as Error, { saleId });
    }
  }
}
