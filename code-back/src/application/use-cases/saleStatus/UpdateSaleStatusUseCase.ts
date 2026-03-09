import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { UpdateSaleStatusDTO } from '@infrastructure/express/validation/saleStatusSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, ValidationError } from '@application/shared/AppError';

export class UpdateSaleStatusUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(dto: UpdateSaleStatusDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.UpdateSaleStatusUseCase,
      'actualizar estado de venta'
    );

    const existing = await this.statusRepo.findById(dto.id);
    if (!existing) throw new NotFoundError('Estado de venta', dto.id);

    if (existing.isSystem) {
      throw new ValidationError('No se puede modificar un estado de sistema');
    }

    return await this.statusRepo.update(dto.id, {
      name: dto.name,
      color: dto.color ?? null,
      isFinal: dto.isFinal,
      isCancelled: dto.isCancelled,
    });
  }
}
