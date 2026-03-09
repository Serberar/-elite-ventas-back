import { RegisterUserUseCase } from '@application/use-cases/user/RegisterUserUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import { ConflictError } from '@application/shared/AppError';
import bcrypt from 'bcryptjs';
import logger from '@infrastructure/observability/logger/logger';

jest.mock('bcryptjs');
jest.mock('@infrastructure/observability/logger/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
}));

// Mock crypto.randomUUID globalmente
const mockUUID = jest.fn(() => 'generated-uuid');
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockUUID },
  writable: true,
});
describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      update: jest.fn(),
      updateLastLogin: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      saveRefreshToken: jest.fn(),
      findByRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      updateFailedAttempts: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    useCase = new RegisterUserUseCase(mockRepository);
    jest.clearAllMocks();
  });

  it('debería registrar un usuario exitosamente', async () => {
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: 'password123',
      role: 'comercial' as const,
    };

    mockRepository.findByUsername.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockRepository.create.mockResolvedValue(undefined);

    const result = await useCase.execute(userData);

    expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockRepository.create).toHaveBeenCalledWith(expect.any(User));

    const createdUser = mockRepository.create.mock.calls[0][0];
    expect(createdUser.id).toBe('generated-uuid');
    expect(createdUser.firstName).toBe('Juan');
    expect(createdUser.lastName).toBe('Pérez');
    expect(createdUser.username).toBe('juan123');
    expect(createdUser.password).toBe('hashed-password');
    expect(createdUser.role).toBe('comercial');
    expect(createdUser.lastLoginAt).toBeNull();

    expect(result).toBeInstanceOf(User);
    expect(result.username).toBe('juan123');
    expect(result.role).toBe('comercial');

    expect(logger.info).toHaveBeenCalledWith('Intentando registrar usuario: juan123');
    expect(logger.info).toHaveBeenCalledWith(
      'Usuario registrado exitosamente: juan123 (generated-uuid)'
    );
  });

  it('debería registrar un usuario administrador', async () => {
    const userData = {
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      password: 'adminpass',
      role: 'administrador' as const,
    };

    mockRepository.findByUsername.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-admin-password');
    mockRepository.create.mockResolvedValue(undefined);

    const result = await useCase.execute(userData);

    expect(result.role).toBe('administrador');
    expect(result.firstName).toBe('Admin');
    expect(result.lastName).toBe('User');
    expect(result.username).toBe('admin');
  });

  it('debería lanzar ConflictError cuando el username ya existe', async () => {
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'existing-user',
      password: 'password123',
      role: 'comercial' as const,
    };

    const existingUser = new User(
      'existing-id',
      'Existing',
      'User',
      'existing-user',
      'hashed-password',
      'comercial'
    );

    mockRepository.findByUsername.mockResolvedValue(existingUser);

    await expect(useCase.execute(userData)).rejects.toThrow(ConflictError);
    await expect(useCase.execute(userData)).rejects.toThrow('Nombre de usuario ya registrado');

    expect(mockRepository.findByUsername).toHaveBeenCalledWith('existing-user');
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockRepository.create).not.toHaveBeenCalled();

    expect(logger.warn).toHaveBeenCalledWith(
      'Intento de registro con username duplicado: existing-user'
    );
  });

  it('debería manejar errores del hash de password', async () => {
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: 'password123',
      role: 'comercial' as const,
    };

    mockRepository.findByUsername.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Hash error'));

    await expect(useCase.execute(userData)).rejects.toThrow('Hash error');

    expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('debería manejar errores del repositorio en la creación', async () => {
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: 'password123',
      role: 'comercial' as const,
    };

    mockRepository.findByUsername.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    mockRepository.create.mockRejectedValue(new Error('Database error'));

    await expect(useCase.execute(userData)).rejects.toThrow('Database error');

    expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockRepository.create).toHaveBeenCalledWith(expect.any(User));
  });

  it('debería manejar errores del repositorio en la consulta', async () => {
    const userData = {
      firstName: 'Juan',
      lastName: 'Pérez',
      username: 'juan123',
      password: 'password123',
      role: 'comercial' as const,
    };

    mockRepository.findByUsername.mockRejectedValue(new Error('Database query error'));

    await expect(useCase.execute(userData)).rejects.toThrow('Database query error');

    expect(mockRepository.findByUsername).toHaveBeenCalledWith('juan123');
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockRepository.create).not.toHaveBeenCalled();
  });
});
