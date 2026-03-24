import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, DatabaseError, AuthorizationError } from '@application/shared/AppError';

export class UpdateClientSnapshotUseCase {
  constructor(private saleRepo: ISaleRepository) {}

  async execute(saleId: string, clientSnapshot: any, currentUser: CurrentUser, comercial?: string) {
    checkRolePermission(
      currentUser,
      rolePermissions.sale.UpdateClientSnapshotUseCase,
      'actualizar datos del cliente en la venta'
    );

    // Verificar que la venta existe y pertenece a esta empresa
    const sale = await this.saleRepo.findById(saleId);
    if (!sale) {
      throw new NotFoundError('Venta', saleId);
    }
    if (sale.empresaId !== currentUser.empresaId) {
      throw new AuthorizationError('No tienes permiso para modificar esta venta');
    }

    // Actualizar el clientSnapshot y comercial
    await this.saleRepo.updateClientSnapshot(saleId, clientSnapshot, comercial);

    // Registrar en el historial
    await this.saleRepo.addHistory({
      saleId,
      userId: currentUser.id,
      action: 'update_client_snapshot',
      payload: { clientSnapshot, comercial },
    });

    // Obtener la venta actualizada con todas las relaciones
    const updatedSale = await this.saleRepo.findWithRelations(saleId);

    if (!updatedSale) {
      throw new DatabaseError('Error al obtener la venta actualizada');
    }

    return {
      ...updatedSale.sale.toPrisma(),
      client: clientSnapshot,
      status: updatedSale.status ?? null,
      items: updatedSale.items.map((item) => item.toPrisma()),
      assignments: updatedSale.assignments.map((a) => a.toPrisma()),
      histories: updatedSale.histories.map((h) => h.toPrisma()),
    };
  }
}
