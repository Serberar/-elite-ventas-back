import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { ReorderSaleStatusesDTO } from '@infrastructure/express/validation/saleStatusSchemas';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { AuthorizationError } from '@application/shared/AppError';

export class ReorderSaleStatusesUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(dto: ReorderSaleStatusesDTO, currentUser: CurrentUser) {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.ReorderSaleStatusesUseCase,
      'reordenar estados'
    );

    // Verificar que todos los estados pertenecen a la empresa del usuario
    const statuses = await this.statusRepo.list(currentUser.empresaId);
    const ownIds = new Set(statuses.map((s) => s.id));
    const hasExternal = dto.statuses.some((s) => !ownIds.has(s.id));
    if (hasExternal) {
      throw new AuthorizationError('No tienes permiso para reordenar estos estados');
    }

    return await this.statusRepo.reorder(dto.statuses);
  }
}
