import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { HandleSignatureWebhookUseCase } from './HandleSignatureWebhookUseCase';
import logger from '@infrastructure/observability/logger/logger';

export class GetConsentStatusUseCase {
  constructor(
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private handleWebhookUseCase: HandleSignatureWebhookUseCase
  ) {}

  async execute(saleId: string, currentUser: CurrentUser): Promise<SignatureRequest | null> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.GetSignatureStatusUseCase,
      'consultar estado de autorización de llamada'
    );

    const consentRequest = await this.signatureRepo.findBySaleIdAndType(saleId, 'consent');

    if (consentRequest?.status === 'signed' && !consentRequest.signedDocumentUrl && consentRequest.providerDocumentId) {
      // Firmado pero sin evidencia: intentar obtenerla del proveedor
      try {
        const { signedUrl } = await this.signatureProvider.getDocumentStatus(consentRequest.providerDocumentId);
        if (signedUrl) {
          const updated = await this.signatureRepo.update(consentRequest.id, { signedDocumentUrl: signedUrl });
          logger.info('[Consentimiento] Evidencia obtenida por polling post-firma', { saleId, signedUrl });
          return updated;
        }
      } catch (err) {
        logger.debug('[Consentimiento] Error obteniendo evidencia post-firma por polling', err as Error);
      }
    }

    if (consentRequest?.status === 'pending' && consentRequest.providerDocumentId) {
      try {
        const providerResult = await this.signatureProvider.getDocumentStatus(
          consentRequest.providerDocumentId
        );
        const { status } = providerResult;

        if (status === 'signed' || status === 'rejected') {
          logger.info('[Consentimiento] Estado detectado por polling, actualizando BD', {
            saleId,
            providerDocumentId: consentRequest.providerDocumentId,
            status,
          });
          return await this.handleWebhookUseCase.execute({
            providerDocumentId: consentRequest.providerDocumentId,
            event: status,
            signedUrl: providerResult.signedUrl,
            rejectionReason: status === 'rejected' ? (providerResult.rejectionReason ?? 'Rechazado por el firmante') : undefined,
          });
        }

        // Si ya está firmado en BD pero sin evidencia, seguir reportando el estado actual
        // para que el frontend siga actualizando hasta que el callback de Lleida.net traiga la evidencia
      } catch (err) {
        logger.debug('[Consentimiento] Error consultando estado en Lleida.net por polling', err as Error);
      }
    }

    return consentRequest;
  }
}
