import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import logger from '@infrastructure/observability/logger/logger';
import { NotFoundError, ConflictError, AuthorizationError } from '@application/shared/AppError';
import bcrypt from 'bcryptjs';
import { CurrentUser } from '@application/shared/types/CurrentUser';

export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  role?: string;
  active?: boolean;
}

export interface UpdateUserResult {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  active: boolean;
  failedLoginAttempts: number;
  empresaId: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export class UpdateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, data: UpdateUserDTO, currentUser: CurrentUser): Promise<UpdateUserResult> {
    logger.info(`Intentando actualizar usuario: ${userId}`);

    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      logger.warn(`Usuario no encontrado para actualizar: ${userId}`);
      throw new NotFoundError('Usuario no encontrado');
    }

    if (existingUser.empresaId !== currentUser.empresaId) {
      throw new AuthorizationError('No tienes permiso para modificar usuarios de otra empresa');
    }

    if (data.username && data.username !== existingUser.username) {
      const userWithUsername = await this.userRepository.findByUsername(data.username);
      if (userWithUsername) {
        logger.warn(`Username ya existe: ${data.username}`);
        throw new ConflictError('El nombre de usuario ya está en uso');
      }
    }

    let newPassword = existingUser.password;
    if (data.password) {
      newPassword = await bcrypt.hash(data.password, 10);
    }

    const newActive = data.active !== undefined ? data.active : existingUser.active;
    // Al reactivar una cuenta se resetean los intentos fallidos
    const newFailedAttempts = data.active === true ? 0 : existingUser.failedLoginAttempts;

    const updatedUser = new User(
      existingUser.id,
      data.firstName ?? existingUser.firstName,
      data.lastName ?? existingUser.lastName,
      data.username ?? existingUser.username,
      newPassword,
      data.role ?? existingUser.role,
      existingUser.empresaId,
      newActive,
      newFailedAttempts,
      existingUser.createdAt,
      existingUser.lastLoginAt,
      existingUser.refreshToken,
      existingUser.refreshTokenExpiresAt
    );

    await this.userRepository.update(updatedUser);

    logger.info(`Usuario actualizado exitosamente: ${userId}`);

    return {
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
      role: updatedUser.role,
      active: updatedUser.active,
      failedLoginAttempts: updatedUser.failedLoginAttempts,
      empresaId: updatedUser.empresaId,
      createdAt: updatedUser.createdAt.toISOString(),
      lastLoginAt: updatedUser.lastLoginAt?.toISOString() ?? null,
    };
  }
}
