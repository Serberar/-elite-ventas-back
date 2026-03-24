import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import bcrypt from 'bcryptjs';
import logger from '@infrastructure/observability/logger/logger';
import { ConflictError } from '@application/shared/AppError';

export class RegisterUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    role: 'administrador' | 'coordinador' | 'comercial';
    empresaId: string;
  }): Promise<User> {
    logger.info(`Intentando registrar usuario: ${data.username}`);

    // Validar que no exista usuario con ese username
    const userByUsername = await this.userRepository.findByUsername(data.username);
    if (userByUsername) {
      logger.warn(`Intento de registro con username duplicado: ${data.username}`);
      throw new ConflictError('Nombre de usuario ya registrado');
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Crear usuario
    const user = new User(
      crypto.randomUUID(),
      data.firstName,
      data.lastName,
      data.username,
      hashedPassword,
      data.role,
      data.empresaId
    );

    await this.userRepository.create(user);

    logger.info(`Usuario registrado exitosamente: ${data.username} (${user.id})`);
    return user;
  }
}
