import { PushDataClientUseCase } from '@application/use-cases/client/PushDataClientUseCase';
import { IClientRepository } from '@domain/repositories/IClientRepository';
import { Client } from '@domain/entities/Client';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { checkRolePermission } from '@application/shared/authorization/checkRolePermission';

jest.mock('@application/shared/authorization/checkRolePermission');

describe('PushDataClientUseCase', () => {
  let useCase: PushDataClientUseCase;
  let mockRepository: jest.Mocked<IClientRepository>;
  let mockCurrentUser: CurrentUser;
  let existingClient: Client;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      getByPhoneOrDNI: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IClientRepository>;

    mockCurrentUser = {
      id: 'user-1',
      firstName: 'testuser',
      role: 'coordinador',
      empresaId: '00000000-0000-0000-0000-000000000001',
    };

    existingClient = new Client(
      'client-1',
      'Juan',
      'Pérez',
      '12345678A',
      'juan@example.com',
      '1990-01-01',
      ['123456789'],
      [{ address: 'Calle Original 123' }],
      ['ES1234567890123456789012'],
      ['Comentario original'],
      'Autorizado Original',
      'Empresa Original SL',
      new Date('2023-01-01'),
      new Date('2023-01-01'),
      '00000000-0000-0000-0000-000000000001'
    );

    useCase = new PushDataClientUseCase(mockRepository);
    jest.clearAllMocks();
  });

  it('debería añadir todos los tipos de datos al cliente existente', async () => {
    const appendData = {
      id: 'client-1',
      phones: ['987654321', '555123456'],
      addresses: [
        { address: 'Nueva Dirección 456', cupsLuz: 'ES0123456789012345AB' },
        { address: 'Oficina Central 789', cupsGas: 'ES9876543210987654CD' },
      ],
      bankAccounts: ['ES9876543210987654321098', 'ES1111222233334444555566'],
      comments: ['Nuevo comentario 1', 'Nuevo comentario 2'],
    };

    mockRepository.getById.mockResolvedValue(existingClient);
    mockRepository.update.mockResolvedValue(undefined);
    (checkRolePermission as jest.Mock).mockReturnValue(true);

    const result = await useCase.execute(appendData, mockCurrentUser);

    expect(checkRolePermission).toHaveBeenCalledWith(
      mockCurrentUser,
      expect.any(Array),
      'añade datos al cliente'
    );
    expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
    expect(mockRepository.update).toHaveBeenCalledWith(expect.any(Client));

    // Verificar que los datos se han añadido correctamente
    expect(result.phones).toEqual(['123456789', '987654321', '555123456']);
    expect(result.addresses).toEqual([
      { address: 'Calle Original 123' },
      { address: 'Nueva Dirección 456', cupsLuz: 'ES0123456789012345AB' },
      { address: 'Oficina Central 789', cupsGas: 'ES9876543210987654CD' },
    ]);
    expect(result.bankAccounts).toEqual([
      'ES1234567890123456789012',
      'ES9876543210987654321098',
      'ES1111222233334444555566',
    ]);
    expect(result.comments).toEqual([
      'Comentario original',
      'Nuevo comentario 1',
      'Nuevo comentario 2',
    ]);

    // Verificar que los datos originales se mantienen
    expect(result.id).toBe('client-1');
    expect(result.firstName).toBe('Juan');
    expect(result.lastName).toBe('Pérez');
    expect(result.dni).toBe('12345678A');
    expect(result.authorized).toBe('Autorizado Original');
    expect(result.businessName).toBe('Empresa Original SL');
    expect(result.createdAt).toEqual(existingClient.createdAt);
    expect(result.lastModified).not.toEqual(existingClient.lastModified); // Debe ser actualizado
  });

  it('debería añadir solo teléfonos cuando solo se proporcionan teléfonos', async () => {
    const appendData = {
      id: 'client-1',
      phones: ['111222333'],
    };

    mockRepository.getById.mockResolvedValue(existingClient);
    mockRepository.update.mockResolvedValue(undefined);
    (checkRolePermission as jest.Mock).mockReturnValue(true);

    const result = await useCase.execute(appendData, mockCurrentUser);

    expect(result.phones).toEqual(['123456789', '111222333']);
    expect(result.addresses).toEqual(existingClient.addresses);
    expect(result.bankAccounts).toEqual(existingClient.bankAccounts);
    expect(result.comments).toEqual(existingClient.comments);
  });

  it('debería mantener datos originales cuando no se proporcionan nuevos datos', async () => {
    const appendData = {
      id: 'client-1',
    };

    mockRepository.getById.mockResolvedValue(existingClient);
    mockRepository.update.mockResolvedValue(undefined);
    (checkRolePermission as jest.Mock).mockReturnValue(true);

    const result = await useCase.execute(appendData, mockCurrentUser);

    expect(result.phones).toEqual(existingClient.phones);
    expect(result.addresses).toEqual(existingClient.addresses);
    expect(result.bankAccounts).toEqual(existingClient.bankAccounts);
    expect(result.comments).toEqual(existingClient.comments);
    expect(result.lastModified).not.toEqual(existingClient.lastModified); // Debe ser actualizado
  });

  it('debería lanzar error cuando el cliente no existe', async () => {
    const appendData = {
      id: 'client-not-found',
      phones: ['111222333'],
    };

    mockRepository.getById.mockResolvedValue(null);
    (checkRolePermission as jest.Mock).mockReturnValue(true);

    await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow(
      'Cliente con ID client-not-found no encontrado'
    );

    expect(mockRepository.getById).toHaveBeenCalledWith('client-not-found');
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('debería lanzar error si el usuario no tiene permisos', async () => {
    const appendData = {
      id: 'client-1',
      phones: ['111222333'],
    };

    (checkRolePermission as jest.Mock).mockImplementation(() => {
      throw new Error('Sin permisos para añade datos al cliente');
    });

    await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow(
      'Sin permisos para añade datos al cliente'
    );

    expect(mockRepository.getById).not.toHaveBeenCalled();
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('debería lanzar error si falla la actualización en el repositorio', async () => {
    const appendData = {
      id: 'client-1',
      phones: ['111222333'],
    };

    mockRepository.getById.mockResolvedValue(existingClient);
    mockRepository.update.mockRejectedValue(new Error('Error de base de datos'));
    (checkRolePermission as jest.Mock).mockReturnValue(true);

    await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow(
      'Error de base de datos'
    );

    expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });
});
