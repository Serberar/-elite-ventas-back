import { ISaleStatusRepository } from '@domain/repositories/ISaleStatusRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, ValidationError } from '@application/shared/AppError';

export class DeleteSaleStatusUseCase {
  constructor(private statusRepo: ISaleStatusRepository) {}

  async execute(id: string, currentUser: CurrentUser): Promise<void> {
    checkRolePermission(
      currentUser,
      rolePermissions.saleStatus.DeleteSaleStatusUseCase,
      'eliminar estados'
    );

    // Verificar que existe
    const existing = await this.statusRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Estado de venta', id);
    }

    // No permitir eliminar estados especiales
    if (existing.isSystem) {
      throw new ValidationError('No se puede eliminar un estado de sistema');
    }

    if (existing.isCancelled) {
      throw new ValidationError('No se puede eliminar el estado de cancelación');
    }

    if (existing.isFinal) {
      throw new ValidationError('No se puede eliminar un estado final');
    }

    await this.statusRepo.delete(id);
  }
}
