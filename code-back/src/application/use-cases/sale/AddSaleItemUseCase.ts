import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { businessSaleItemsAdded } from '@infrastructure/observability/metrics/prometheusMetrics';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';

export class AddSaleItemUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(
    saleId: string,
    item: {
      productId?: string | null;
      nameSnapshot: string;
      skuSnapshot?: string | null;
      unitPrice: number;
      quantity: number;
      finalPrice: number;
    },
    currentUser: CurrentUser
  ) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.AddSaleItemUseCase,
      'añadir item a venta'
    );

    const sale = await this.saleRepo.findById(saleId);
    if (!sale) throw new NotFoundError('Venta', saleId);
    if (sale.empresaId !== currentUser.empresaId) throw new AuthorizationError('No tienes permiso para modificar esta venta');

    const added = await this.saleRepo.addItem(saleId, item);

    businessSaleItemsAdded.inc();

    await this.saleRepo.addHistory({
      saleId,
      userId: currentUser.id,
      action: 'add_item',
      payload: item,
    });

    return added;
  }
}
