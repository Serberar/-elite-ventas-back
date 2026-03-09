import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleItemsDeleted } from '@infrastructure/observability/metrics/prometheusMetrics';

export class RemoveSaleItemUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(saleId: string, itemId: string, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.RemoveSaleItemUseCase,
      'eliminar item de venta'
    );

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
