import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import logger from '@infrastructure/observability/logger/logger';
import { AuthenticationError } from '@application/shared/AppError';

const MAX_FAILED_ATTEMPTS = 20;

export class LoginUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: {
    username: string;
    password: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    logger.info(`Intento de login: ${data.username}`);

    const user = await this.userRepository.findByUsername(data.username);
    if (!user) {
      logger.warn(`Login fallido - usuario no encontrado: ${data.username}`);
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    // Cuenta desactivada manualmente por un administrador
    if (!user.active) {
      logger.warn(`Login fallido - cuenta desactivada: ${data.username}`);
      throw new AuthenticationError('Cuenta desactivada. Contacte con el administrador.');
    }

    // Cuenta bloqueada por demasiados intentos fallidos
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      logger.warn(`Login fallido - cuenta bloqueada por intentos: ${data.username}`);
      throw new AuthenticationError('Cuenta bloqueada por demasiados intentos fallidos. Contacte con el administrador.');
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
      const newAttempts = user.failedLoginAttempts + 1;
      await this.userRepository.updateFailedAttempts(user.id, newAttempts);

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        logger.warn(`Cuenta bloqueada tras ${MAX_FAILED_ATTEMPTS} intentos: ${data.username}`);
        throw new AuthenticationError('Cuenta bloqueada por demasiados intentos fallidos. Contacte con el administrador.');
      }

      logger.warn(`Login fallido - contraseña incorrecta: ${data.username} (intento ${newAttempts}/${MAX_FAILED_ATTEMPTS})`);
      throw new AuthenticationError('Usuario o contraseña incorrectos');
    }

    // Login correcto: resetear contador de intentos
    if (user.failedLoginAttempts > 0) {
      await this.userRepository.updateFailedAttempts(user.id, 0);
    }

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)
      throw new AuthenticationError('Configuración de JWT no disponible');

    // Access token
    const accessToken = jwt.sign(
      { id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Refresh token
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepository.saveRefreshToken(user.id, refreshToken, refreshTokenExpiresAt);

    await this.userRepository.updateLastLogin(user.id, new Date());

    logger.info(`Login exitoso: ${data.username} (${user.id})`);
    return { user, accessToken, refreshToken };
  }
}
