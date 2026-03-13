import { IClientRepository } from '@domain/repositories/IClientRepository';
import { NotFoundError, AuthorizationError } from '@application/shared/AppError';
import logger from '@infrastructure/observability/logger/logger';

export class DeleteClientUseCase {
  constructor(private clientRepository: IClientRepository) {}

  async execute(clientId: string, password: string): Promise<void> {
    const deletePassword = process.env.DELETE_CLIENT_PASSWORD;
    if (!deletePassword || password !== deletePassword) {
      logger.warn(`Intento de eliminación de cliente con contraseña incorrecta: ${clientId}`);
      throw new AuthorizationError('No tienes permiso para eliminar este cliente');
    }

    const client = await this.clientRepository.getById(clientId);
    if (!client) {
      throw new NotFoundError('Cliente', clientId);
    }

    await this.clientRepository.delete(clientId);
    logger.info(`Cliente eliminado: ${clientId}`);
  }

  async verifyPassword(password: string): Promise<boolean> {
    const deletePassword = process.env.DELETE_CLIENT_PASSWORD;
    return !!deletePassword && password === deletePassword;
  }
}
