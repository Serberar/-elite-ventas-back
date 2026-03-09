import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ISignatureProvider } from '@domain/services/ISignatureProvider';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError } from '@application/shared/AppError';

export class CancelSignatureRequestUseCase {
  constructor(
    private signatureRepo: ISignatureRequestRepository,
    private signatureProvider: ISignatureProvider,
    private saleRepo: ISaleRepository
  ) {}

  async execute(saleId: string, currentUser: CurrentUser): Promise<void> {
    checkRolePermission(
      currentUser,
      rolePermissions.signature.CancelSignatureRequestUseCase,
      'cancelar solicitud de firma'
    );

    const signatureRequest = await this.signatureRepo.findBySaleId(saleId);
    if (!signatureRequest) throw new NotFoundError('SolicitudFirma', saleId);

    if (signatureRequest.providerDocumentId) {
      await this.signatureProvider.cancelDocument(signatureRequest.providerDocumentId);
    }

    await this.signatureRepo.delete(signatureRequest.id);

    await this.saleRepo.addHistory({
      saleId,
      userId: currentUser.id,
      action: 'signature_cancelled',
      payload: {
        signatureRequestId: signatureRequest.id,
        providerDocumentId: signatureRequest.providerDocumentId,
      },
    });
  }
}
