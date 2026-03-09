import { IUserRepository } from '@domain/repositories/IUserRepository';
import logger from '@infrastructure/observability/logger/logger';
import { NotFoundError } from '@application/shared/AppError';

export class DeleteUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string): Promise<void> {
    logger.info(`Intentando eliminar usuario: ${userId}`);

    // Verificar que el usuario existe
    const user = await this.userRepository.findById(userId);
    if (!user) {
      logger.warn(`Usuario no encontrado para eliminar: ${userId}`);
      throw new NotFoundError('Usuario no encontrado');
    }

    await this.userRepository.delete(userId);

    logger.info(`Usuario eliminado exitosamente: ${userId}`);
  }
}
