import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleItemsDeleted } from '@infrastructure/observability/metrics/prometheusMetrics';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';

export class RemoveSaleItemUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(saleId: string, itemId: string, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.RemoveSaleItemUseCase,
      'eliminar item de venta'
    );

    const sale = await this.saleRepo.findById(saleId);
    if (!sale) throw new NotFoundError('Venta', saleId);
    if (sale.empresaId !== currentUser.empresaId) throw new AuthorizationError('No tienes permiso para modificar esta venta');

    await this.saleRepo.removeItem(itemId);

    businessSaleItemsDeleted.inc();

    await this.saleRepo.addHistory({
      saleId,
      userId: currentUser.id,
      action: 'delete_item',
      payload: { itemId },
    });
  }
}
