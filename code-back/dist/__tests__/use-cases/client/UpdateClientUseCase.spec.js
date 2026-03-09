"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const UpdateClientUseCase_1 = require("../../../application/use-cases/client/UpdateClientUseCase");
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../../application/shared/authorization/checkRolePermission");
jest.mock('@application/shared/authorization/checkRolePermission');
describe('UpdateClientUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCurrentUser;
    let existingClient;
    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            getById: jest.fn(),
            update: jest.fn(),
            getByPhoneOrDNI: jest.fn(),
        };
        mockCurrentUser = {
            id: 'user-1',
            firstName: 'testuser',
            role: 'administrador',
        };
        existingClient = new Client_1.Client('client-1', 'Juan', 'Pérez', '12345678A', 'juan@example.com', '1990-01-01', ['123456789'], [{ address: 'Calle Original 123' }], ['ES1234567890123456789012'], ['Comentario original'], 'Autorizado Original', 'Empresa Original SL', new Date('2023-01-01'), new Date('2023-01-01'));
        useCase = new UpdateClientUseCase_1.UpdateClientUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería actualizar todos los campos del cliente', async () => {
        const updateData = {
            id: 'client-1',
            firstName: 'Juan Carlos',
            lastName: 'Pérez García',
            dni: '12345678B',
            email: 'juancarlos@newmail.com',
            birthday: '1990-02-15',
            phones: ['987654321', '555123456'],
            addresses: [
                { address: 'Nueva Dirección 456', cupsLuz: 'ES0123456789012345AB' },
                { address: 'Oficina Central 789', cupsGas: 'ES9876543210987654CD' },
            ],
            bankAccounts: ['ES9876543210987654321098'],
            comments: ['Comentario actualizado'],
            authorized: 'Nuevo Autorizado',
            businessName: 'Nueva Empresa SL',
        };
        mockRepository.getById.mockResolvedValue(existingClient);
        mockRepository.update.mockResolvedValue(undefined);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(updateData, mockCurrentUser);
        expect(checkRolePermission_1.checkRolePermission).toHaveBeenCalledWith(mockCurrentUser, expect.any(Array), 'actualiza datos del cliente');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
        expect(mockRepository.update).toHaveBeenCalledWith(expect.any(Client_1.Client));
        // Verificar que todos los campos se han actualizado
        expect(result.firstName).toBe('Juan Carlos');
        expect(result.lastName).toBe('Pérez García');
        expect(result.dni).toBe('12345678B');
        expect(result.email).toBe('juancarlos@newmail.com');
        expect(result.birthday).toBe('1990-02-15');
        expect(result.phones).toEqual(['987654321', '555123456']);
        expect(result.addresses).toEqual([
            { address: 'Nueva Dirección 456', cupsLuz: 'ES0123456789012345AB' },
            { address: 'Oficina Central 789', cupsGas: 'ES9876543210987654CD' },
        ]);
        expect(result.bankAccounts).toEqual(['ES9876543210987654321098']);
        expect(result.comments).toEqual(['Comentario actualizado']);
        expect(result.authorized).toBe('Nuevo Autorizado');
        expect(result.businessName).toBe('Nueva Empresa SL');
        // Verificar que el ID y timestamps se manejan correctamente
        expect(result.id).toBe('client-1');
        expect(result.createdAt).toEqual(existingClient.createdAt);
        expect(result.lastModified).not.toEqual(existingClient.lastModified);
    });
    it('debería actualizar solo los campos proporcionados', async () => {
        const updateData = {
            id: 'client-1',
            firstName: 'Juan Carlos',
            email: 'nuevo@email.com',
        };
        mockRepository.getById.mockResolvedValue(existingClient);
        mockRepository.update.mockResolvedValue(undefined);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(updateData, mockCurrentUser);
        // Campos actualizados
        expect(result.firstName).toBe('Juan Carlos');
        expect(result.email).toBe('nuevo@email.com');
        // Campos que deben mantenerse igual
        expect(result.lastName).toBe('Pérez');
        expect(result.dni).toBe('12345678A');
        expect(result.birthday).toBe('1990-01-01');
        expect(result.phones).toEqual(['123456789']);
        expect(result.addresses).toEqual([{ address: 'Calle Original 123' }]);
        expect(result.bankAccounts).toEqual(['ES1234567890123456789012']);
        expect(result.comments).toEqual(['Comentario original']);
        expect(result.authorized).toBe('Autorizado Original');
        expect(result.businessName).toBe('Empresa Original SL');
    });
    it('debería mantener todos los datos originales cuando no se proporciona ninguna actualización', async () => {
        const updateData = {
            id: 'client-1',
        };
        mockRepository.getById.mockResolvedValue(existingClient);
        mockRepository.update.mockResolvedValue(undefined);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(updateData, mockCurrentUser);
        // Todos los campos deben mantenerse igual excepto lastModified
        expect(result.firstName).toBe(existingClient.firstName);
        expect(result.lastName).toBe(existingClient.lastName);
        expect(result.dni).toBe(existingClient.dni);
        expect(result.email).toBe(existingClient.email);
        expect(result.birthday).toBe(existingClient.birthday);
        expect(result.phones).toEqual(existingClient.phones);
        expect(result.addresses).toEqual(existingClient.addresses);
        expect(result.bankAccounts).toEqual(existingClient.bankAccounts);
        expect(result.comments).toEqual(existingClient.comments);
        expect(result.authorized).toBe(existingClient.authorized);
        expect(result.businessName).toBe(existingClient.businessName);
        expect(result.createdAt).toEqual(existingClient.createdAt);
        expect(result.lastModified).not.toEqual(existingClient.lastModified);
    });
    it('debería lanzar error cuando el cliente no existe', async () => {
        const updateData = {
            id: 'client-not-found',
            firstName: 'Juan Carlos',
        };
        mockRepository.getById.mockResolvedValue(null);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        await expect(useCase.execute(updateData, mockCurrentUser)).rejects.toThrow('cliente no válido');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-not-found');
        expect(mockRepository.update).not.toHaveBeenCalled();
    });
    it('debería lanzar error si el usuario no tiene permisos', async () => {
        const updateData = {
            id: 'client-1',
            firstName: 'Juan Carlos',
        };
        checkRolePermission_1.checkRolePermission.mockImplementation(() => {
            throw new Error('Sin permisos para actualiza datos del cliente');
        });
        await expect(useCase.execute(updateData, mockCurrentUser)).rejects.toThrow('Sin permisos para actualiza datos del cliente');
        expect(mockRepository.getById).not.toHaveBeenCalled();
        expect(mockRepository.update).not.toHaveBeenCalled();
    });
    it('debería lanzar error si falla la actualización en el repositorio', async () => {
        const updateData = {
            id: 'client-1',
            firstName: 'Juan Carlos',
        };
        mockRepository.getById.mockResolvedValue(existingClient);
        mockRepository.update.mockRejectedValue(new Error('Error de base de datos'));
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        await expect(useCase.execute(updateData, mockCurrentUser)).rejects.toThrow('Error de base de datos');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
        expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });
});
