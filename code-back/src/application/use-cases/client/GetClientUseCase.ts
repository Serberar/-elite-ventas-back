import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client } from '@domain/entities/Client';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';

export class GetClientUseCase {
  constructor(private clientRepository: IClientRepository) {}

  async execute(value: string, currentUser: CurrentUser): Promise<Client[]> {
    // Valida permisos
    checkRolePermission(
      currentUser,
      rolePermissions.client.GetClientUseCase,
      'descargar clientes por teléfono o DNI'
    );

    const clients = await this.clientRepository.getByPhoneOrDNI(value, currentUser.empresaId);
    if (!clients || clients.length === 0) {
      return [];
    }
    return clients;
  }
}
