"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PushDataClientUseCase_1 = require("../../../application/use-cases/client/PushDataClientUseCase");
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../../application/shared/authorization/checkRolePermission");
jest.mock('@application/shared/authorization/checkRolePermission');
describe('PushDataClientUseCase', () => {
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
            role: 'coordinador',
        };
        existingClient = new Client_1.Client('client-1', 'Juan', 'Pérez', '12345678A', 'juan@example.com', '1990-01-01', ['123456789'], [{ address: 'Calle Original 123' }], ['ES1234567890123456789012'], ['Comentario original'], 'Autorizado Original', 'Empresa Original SL', new Date('2023-01-01'), new Date('2023-01-01'));
        useCase = new PushDataClientUseCase_1.PushDataClientUseCase(mockRepository);
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
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(appendData, mockCurrentUser);
        expect(checkRolePermission_1.checkRolePermission).toHaveBeenCalledWith(mockCurrentUser, expect.any(Array), 'añade datos al cliente');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
        expect(mockRepository.update).toHaveBeenCalledWith(expect.any(Client_1.Client));
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
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
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
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
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
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow('Client not found');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-not-found');
        expect(mockRepository.update).not.toHaveBeenCalled();
    });
    it('debería lanzar error si el usuario no tiene permisos', async () => {
        const appendData = {
            id: 'client-1',
            phones: ['111222333'],
        };
        checkRolePermission_1.checkRolePermission.mockImplementation(() => {
            throw new Error('Sin permisos para añade datos al cliente');
        });
        await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow('Sin permisos para añade datos al cliente');
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
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        await expect(useCase.execute(appendData, mockCurrentUser)).rejects.toThrow('Error de base de datos');
        expect(mockRepository.getById).toHaveBeenCalledWith('client-1');
        expect(mockRepository.update).toHaveBeenCalledTimes(1);
    });
});
