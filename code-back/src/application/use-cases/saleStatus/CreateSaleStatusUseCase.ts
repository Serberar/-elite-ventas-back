import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { CreateSaleStatusDTO } from '@infrastructure/express/validation/saleStatusSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class CreateSaleStatusUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(dto: CreateSaleStatusDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.CreateSaleStatusUseCase,
      'crear estado de venta'
    );

    return await this.statusRepo.create({
      name: dto.name,
      order: dto.order,
      color: dto.color ?? null,
      isFinal: dto.isFinal ?? false,
      isCancelled: dto.isCancelled ?? false,
    });
  }
}
