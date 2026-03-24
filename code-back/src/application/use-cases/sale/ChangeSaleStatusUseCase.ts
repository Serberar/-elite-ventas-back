import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { ISignatureRequestRepository } from '@domain/repositories/ISignatureRequestRepository';
import { ChangeSaleStatusInternal } from '@infrastructure/express/validation/saleSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { Sale } from '@domain/entities/Sale';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleStatusChanged } from '@infrastructure/observability/metrics/prometheusMetrics';
import { NotFoundError, ValidationError, AuthorizationError } from '@application/shared/AppError';

export class ChangeSaleStatusUseCase {
  constructor(
    private saleRepo: ISaleRepository,
    private statusRepo: ISaleStatusRepository,
    private signatureRepo?: ISignatureRequestRepository
  ) {}

  async execute(dto: ChangeSaleStatusInternal, currentUser: CurrentUser): Promise<Sale> {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.ChangeSaleStatusUseCase,
      'cambiar estado de venta'
    );

    const sale = await this.saleRepo.findById(dto.saleId);
    if (!sale) throw new NotFoundError('Venta', dto.saleId);
    if (sale.empresaId !== currentUser.empresaId) throw new AuthorizationError('No tienes permiso para modificar esta venta');

    const status = await this.statusRepo.findById(dto.statusId);
    if (!status) throw new NotFoundError('Estado', dto.statusId);

    // Bloquear avance a estado final sin firma (salvo administrador)
    if (status.isFinal && currentUser.role !== 'administrador' && this.signatureRepo) {
      const signatureRequest = await this.signatureRepo.findBySaleId(dto.saleId);
      if (!signatureRequest || signatureRequest.status !== 'signed') {
        throw new ValidationError(
          'No se puede finalizar la venta sin firma. Envía el contrato al cliente o gestiona la firma manualmente.'
        );
      }
    }

    const previousStatus = await this.statusRepo.findById(sale.statusId);

    const updated = await this.saleRepo.update(sale.id, {
      statusId: status.id,
      closedAt: status.isFinal ? new Date() : null,
    });

    await this.saleRepo.addHistory({
      saleId: sale.id,
      userId: currentUser.id,
      action: 'change_status',
      payload: {
        from: sale.statusId,
        fromName: previousStatus?.name ?? null,
        to: status.id,
        toName: status.name,
        comment: dto.comment ?? null,
      },
    });

    businessSaleStatusChanged.inc();

    return updated;
  }
}
