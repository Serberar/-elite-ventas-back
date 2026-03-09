import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { SaleFiltersInternal } from '@infrastructure/express/validation/saleSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class ListSalesWithFiltersUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(filters: SaleFiltersInternal, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.ListSalesWithFiltersUseCase,
      'listar ventas con filtros'
    );

    return this.saleRepo.list(filters);
  }
}
