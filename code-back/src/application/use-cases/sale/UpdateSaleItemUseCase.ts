import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { UpdateSaleItemsDTO } from '@infrastructure/express/validation/saleSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleItemsUpdated } from '@infrastructure/observability/metrics/prometheusMetrics';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';

export class UpdateSaleItemUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(dto: UpdateSaleItemsDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.UpdateSaleItemUseCase,
      'actualizar items de venta'
    );

    const sale = await this.saleRepo.findById(dto.saleId);
    if (!sale) throw new NotFoundError('Venta', dto.saleId);
    if (sale.empresaId !== currentUser.empresaId) throw new AuthorizationError('No tienes permiso para modificar esta venta');

    for (const item of dto.items) {
      await this.saleRepo.updateItem(item.id, {
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        finalPrice: item.finalPrice,
      });

      await this.saleRepo.addHistory({
        saleId: dto.saleId,
        userId: currentUser.id,
        action: 'update_item',
        payload: item,
      });
    }

    businessSaleItemsUpdated.inc(dto.items.length);
  }
}
