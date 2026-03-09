import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { SignatureRequest } from '@domain/entities/SignatureRequest';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { HandleSignatureWebhookUseCase } from './HandleSignatureWebhookUseCase';
import logger from '@infrastructure/observability/logger/logger';

export class GetSignatureStatusUseCase {
  constructor(
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private handleWebhookUseCase: HandleSignatureWebhookUseCase
  ) {}

  async execute(saleId: string, currentUser: CurrentUser): Promise<SignatureRequest | null> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.GetSignatureStatusUseCase,
      'consultar estado de firma'
    );

    const signatureRequest = await this.signatureRepo.findBySaleId(saleId);

    // Si está pendiente y tiene ID de proveedor, consultamos a Lleida.net en tiempo real
    if (signatureRequest?.status === 'pending' && signatureRequest.providerDocumentId) {
      try {
        const { status } = await this.signatureProvider.getDocumentStatus(
          signatureRequest.providerDocumentId
        );

        if (status === 'signed' || status === 'rejected') {
          logger.info('[Firma] Estado detectado por polling, actualizando BD', {
            saleId,
            providerDocumentId: signatureRequest.providerDocumentId,
            status,
          });
          return await this.handleWebhookUseCase.execute({
            providerDocumentId: signatureRequest.providerDocumentId,
            event: status,
            rejectionReason: status === 'rejected' ? 'Rechazado por el firmante' : undefined,
          });
        }
      } catch (err) {
        // Si falla la consulta al proveedor, devolvemos el estado actual de la BD
        logger.debug('[Firma] Error consultando estado en Lleida.net por polling', err as Error);
      }
    }

    return signatureRequest;
  }
}
