import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client, AddressInfo } from '@domain/entities/Client';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError } from '@application/shared/AppError';

interface UpdateClientDTO {
  id: string;
  firstName?: string;
  lastName?: string;
  dni?: string;
  email?: string;
  birthday?: string;
  phones?: string[];
  addresses?: AddressInfo[];
  bankAccounts?: string[];
  comments?: string[];
  authorized?: string;
  businessName?: string;
}

export class UpdateClientUseCase {
  constructor(private clientRepo: IClientRepository) {}

  async execute(data: UpdateClientDTO, currentUser: CurrentUser): Promise<Client> {
    // Valida permisos
    checkRolePermission(
      currentUser,
      rolePermissions.client.UpdateClientUseCase,
      'actualiza datos del cliente'
    );

    const existingClient = await this.clientRepo.getById(data.id);
    if (!existingClient) {
      throw new NotFoundError('Cliente', data.id);
    }

    const updatedClient = new Client(
      existingClient.id,
      data.firstName ?? existingClient.firstName,
      data.lastName ?? existingClient.lastName,
      data.dni ?? existingClient.dni,
      data.email ?? existingClient.email,
      data.birthday ?? existingClient.birthday,
      data.phones ?? existingClient.phones,
      data.addresses ?? existingClient.addresses,
      data.bankAccounts ?? existingClient.bankAccounts,
      data.comments ?? existingClient.comments,
      data.authorized ?? existingClient.authorized,
      data.businessName ?? existingClient.businessName,
      existingClient.createdAt,
      new Date() // lastModified actualizado
    );

    await this.clientRepo.update(updatedClient);
    return updatedClient;
  }
}
