import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client } from '@domain/entities/Client';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';
import { rolePermissions } from '@application/shared/authorization/rolePermissions';
import crypto from 'crypto';
import logger from '@infrastructure/observability/logger/logger';
import { businessClientsCreated } from '@infrastructure/observability/metrics/prometheusMetrics';

export class CreateClientUseCase {
  constructor(private repository: IClientRepository) {}

  async execute(
    data: {
      firstName: string;
      lastName: string;
      dni: string;
      email: string;
      birthday: string;
      phones?: string[];
      addresses?: { address: string; cupsLuz?: string; cupsGas?: string }[];
      bankAccounts?: string[];
      comments?: string[];
      authorized?: string;
      businessName?: string;
    },
    currentUser: CurrentUser
  ): Promise<Client> {
    logger.info(`Creando cliente: ${data.firstName} ${data.lastName} - Usuario: ${currentUser.id}`);

    // Valida permisos
    checkRolePermission(currentUser, rolePermissions.client.CreateClientUseCase, 'crear clientes');

    const client = new Client(
      crypto.randomUUID(), // id
      data.firstName,
      data.lastName,
      data.dni,
      data.email,
      data.birthday,
      data.phones || [],
      data.addresses || [],
      data.bankAccounts || [],
      data.comments || [],
      data.authorized,
      data.businessName,
      new Date(), // createdAt
      new Date() // lastModified
    );

    await this.repository.create(client);

    // Registrar métrica de negocio
    businessClientsCreated.inc();

    logger.info(`Cliente creado exitosamente: ${client.id} - DNI: ${client.dni}`);
    return client;
  }
}
