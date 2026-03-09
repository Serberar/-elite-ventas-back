import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { ReorderSaleStatusesDTO } from '@infrastructure/express/validation/saleStatusSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class ReorderSaleStatusesUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(dto: ReorderSaleStatusesDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.ReorderSaleStatusesUseCase,
      'reordenar estados'
    );

    // dto.statuses es el array correcto
    return await this.statusRepo.reorder(dto.statuses);
  }
}
