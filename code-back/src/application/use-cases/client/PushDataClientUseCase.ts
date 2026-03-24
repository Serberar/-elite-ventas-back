import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client, AddressInfo } from '@domain/entities/Client';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';

interface AppendClientDataDTO {
  id: string;
  phones?: string[];
  addresses?: AddressInfo[];
  bankAccounts?: string[];
  comments?: string[];
}

export class PushDataClientUseCase {
  constructor(private clientRepo: IClientRepository) {}

  async execute(data: AppendClientDataDTO, currentUser: CurrentUser): Promise<Client> {
    // Valida permisos
    checkRolePermission(
      currentUser,
      rolePermissions.client.PushDataClientUseCase,
      'añade datos al cliente'
    );

    const existingClient = await this.clientRepo.getById(data.id);
    if (!existingClient) {
      throw new NotFoundError('Cliente', data.id);
    }

    if (existingClient.empresaId !== currentUser.empresaId) {
      throw new AuthorizationError('No tienes permiso para modificar este cliente');
    }

    // merge sin borrar
    const updatedPhones = data.phones
      ? [...existingClient.phones, ...data.phones]
      : existingClient.phones;

    const updatedAddresses = data.addresses
      ? [...existingClient.addresses, ...data.addresses]
      : existingClient.addresses;

    const updatedBankAccounts = data.bankAccounts
      ? [...existingClient.bankAccounts, ...data.bankAccounts]
      : existingClient.bankAccounts;

    const updatedComments = data.comments
      ? [...existingClient.comments, ...data.comments]
      : existingClient.comments;

    const updatedClient = new Client(
      existingClient.id,
      existingClient.firstName,
      existingClient.lastName,
      existingClient.dni,
      existingClient.email,
      existingClient.birthday,
      updatedPhones,
      updatedAddresses,
      updatedBankAccounts,
      updatedComments,
      existingClient.authorized,
      existingClient.businessName,
      existingClient.createdAt,
      new Date(), // lastModified actualizado
      existingClient.empresaId
    );

    await this.clientRepo.update(updatedClient);
    return updatedClient;
  }
}
