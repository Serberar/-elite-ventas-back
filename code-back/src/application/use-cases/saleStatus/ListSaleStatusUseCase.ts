import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class ListSaleStatusUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.ListSaleStatusUseCase,
      'listar estados de venta'
    );

    return this.statusRepo.list();
  }
}
