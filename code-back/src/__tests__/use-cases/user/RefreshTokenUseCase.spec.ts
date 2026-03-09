import { RefreshTokenUseCase } from '@application/use-cases/user/RefreshTokenUseCase';
import { IUserRepository } from '@domain/repositories/IUserRepository';
import { User } from '@domain/entities/User';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockRepository: jest.Mocked<IUserRepository>;
  let mockUser: User;

  beforeEach(() => {
    // Configurar variables de entorno antes de cada test
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
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

    mockUser = new User(
      'user-1',
      'Juan',
      'Pérez',
      'juan123',
      'hashed-password',
      'administrador',
      true,
      0,
      new Date(),
      null,
      'valid-refresh-token',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    useCase = new RefreshTokenUseCase(mockRepository);
    jest.clearAllMocks();
  });

  it('debería generar un nuevo access token con refresh token válido', async () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };

    (jwt.verify as jest.Mock).mockReturnValue(payload);
    mockRepository.findById.mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('new-access-token');

    const result = await useCase.execute(refreshToken);

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user-1', role: 'administrador', firstName: 'Juan' },
      'test-secret',
      { expiresIn: '15m' }
    );

    expect(result).toEqual({
      accessToken: 'new-access-token',
      user: mockUser,
    });
  });

  it('debería lanzar error cuando JWT_SECRET no está definido', async () => {
    process.env.JWT_SECRET = '';

    await expect(useCase.execute('valid-refresh-token')).rejects.toThrow(
      'Configuración de JWT no disponible'
    );

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockRepository.findById).not.toHaveBeenCalled();
  });

  it('debería lanzar error cuando JWT_REFRESH_SECRET no está definido', async () => {
    process.env.JWT_REFRESH_SECRET = '';

    await expect(useCase.execute('valid-refresh-token')).rejects.toThrow(
      'Configuración de JWT no disponible'
    );

    expect(jwt.verify).not.toHaveBeenCalled();
    expect(mockRepository.findById).not.toHaveBeenCalled();
  });

  it('debería lanzar error cuando el usuario no existe', async () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { id: 'nonexistent-user', role: 'comercial', firstName: 'Test' };

    (jwt.verify as jest.Mock).mockReturnValue(payload);
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(refreshToken)).rejects.toThrow('Token inválido');

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).toHaveBeenCalledWith('nonexistent-user');
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('debería lanzar error cuando el refresh token no coincide', async () => {
    const refreshToken = 'different-refresh-token';
    const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };

    (jwt.verify as jest.Mock).mockReturnValue(payload);
    mockRepository.findById.mockResolvedValue(mockUser); // tiene 'valid-refresh-token'

    await expect(useCase.execute(refreshToken)).rejects.toThrow('Token inválido');

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('debería lanzar error cuando el refresh token es inválido o expirado', async () => {
    const refreshToken = 'invalid-refresh-token';

    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('JsonWebTokenError');
    });

    await expect(useCase.execute(refreshToken)).rejects.toThrow(
      'Refresh token inválido o expirado'
    );

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('debería lanzar error cuando jwt.verify lanza TokenExpiredError', async () => {
    const refreshToken = 'expired-refresh-token';

    (jwt.verify as jest.Mock).mockImplementation(() => {
      const error = new Error('TokenExpiredError');
      error.name = 'TokenExpiredError';
      throw error;
    });

    await expect(useCase.execute(refreshToken)).rejects.toThrow(
      'Refresh token inválido o expirado'
    );

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('debería manejar errores del repositorio', async () => {
    const refreshToken = 'valid-refresh-token';
    const payload = { id: 'user-1', role: 'administrador', firstName: 'Juan' };

    (jwt.verify as jest.Mock).mockReturnValue(payload);
    mockRepository.findById.mockRejectedValue(new Error('Database error'));

    // Los errores del repositorio se capturan y se re-lanzan como "Refresh token inválido o expirado"
    await expect(useCase.execute(refreshToken)).rejects.toThrow(
      'Refresh token inválido o expirado'
    );

    expect(jwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
    expect(mockRepository.findById).toHaveBeenCalledWith('user-1');
    expect(jwt.sign).not.toHaveBeenCalled();
  });
  it('debería funcionar con diferentes roles de usuario', async () => {
    const mockComercialUser = new User(
      'user-2',
      'Ana',
      'García',
      'ana123',
      'hashed-password',
      'comercial',
      true,
      0,
      new Date(),
      null,
      'comercial-refresh-token',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    const refreshToken = 'comercial-refresh-token';
    const payload = { id: 'user-2', role: 'comercial', firstName: 'Ana' };

    (jwt.verify as jest.Mock).mockReturnValue(payload);
    mockRepository.findById.mockResolvedValue(mockComercialUser);
    (jwt.sign as jest.Mock).mockReturnValue('comercial-access-token');

    const result = await useCase.execute(refreshToken);

    expect(result).toEqual({
      accessToken: 'comercial-access-token',
      user: mockComercialUser,
    });

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 'user-2', role: 'comercial', firstName: 'Ana' },
      'test-secret',
      { expiresIn: '15m' }
    );
  });
});
