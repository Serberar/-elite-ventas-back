import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError } from '@application/shared/AppError';

export class CancelConsentUseCase {
  constructor(
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private saleRepo: ISaleRepository
  ) {}

  async execute(saleId: string, currentUser: CurrentUser): Promise<void> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.CancelSignatureRequestUseCase,
      'cancelar autorización de llamada'
    );

    const consentRequest = await this.signatureRepo.findBySaleIdAndType(saleId, 'consent');
    if (!consentRequest) throw new NotFoundError('AutorizacionLlamada', saleId);

    if (consentRequest.providerDocumentId) {
      await this.signatureProvider.cancelDocument(consentRequest.providerDocumentId);
    }

    await this.signatureRepo.delete(consentRequest.id);

    await this.saleRepo.addHistory({
      saleId,
      userId: currentUser.id,
      action: 'consent_cancelled',
      payload: {
        consentRequestId: consentRequest.id,
        providerDocumentId: consentRequest.providerDocumentId,
      },
    });
  }
}
