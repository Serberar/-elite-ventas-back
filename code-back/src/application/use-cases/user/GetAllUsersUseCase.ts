import { IUserRepository } from '@domain/repositories/IUserRepository';
import logger from '@infrastructure/observability/logger/logger';

export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  active: boolean;
  failedLoginAttempts: number;
  empresaId: string;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export class GetAllUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(empresaId: string, role: string): Promise<UserDTO[]> {
    logger.info('Obteniendo lista de usuarios');

    // Cada empresa ve solo sus propios usuarios
    const users = await this.userRepository.findAll(empresaId);

    const usersDTO: UserDTO[] = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      active: user.active,
      failedLoginAttempts: user.failedLoginAttempts,
      empresaId: user.empresaId,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    }));

    logger.info(`Se obtuvieron ${usersDTO.length} usuarios`);
    return usersDTO;
  }
}
