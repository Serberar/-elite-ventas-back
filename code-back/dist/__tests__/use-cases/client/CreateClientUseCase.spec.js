"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const CreateClientUseCase_1 = require("../../../application/use-cases/client/CreateClientUseCase");
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../../application/shared/authorization/checkRolePermission");
const prometheusMetrics_1 = require("../../../infrastructure/observability/metrics/prometheusMetrics");
const logger_1 = __importDefault(require("../../../infrastructure/observability/logger/logger"));
jest.mock('@application/shared/authorization/checkRolePermission');
jest.mock('@infrastructure/observability/metrics/prometheusMetrics', () => ({
    businessClientsCreated: {
        inc: jest.fn(),
    },
}));
jest.mock('@infrastructure/observability/logger/logger', () => ({
    info: jest.fn(),
}));
describe('CreateClientUseCase', () => {
    let useCase;
    let mockRepository;
    let mockCurrentUser;
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
        useCase = new CreateClientUseCase_1.CreateClientUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería crear un cliente exitosamente', async () => {
        const clientData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            dni: '12345678A',
            email: 'juan@example.com',
            birthday: '1990-01-01',
            phones: ['123456789'],
            addresses: [
                {
                    address: 'Calle Test 123',
                    cupsLuz: 'ES0123456789012345AB',
                    cupsGas: 'ES9876543210987654CD',
                },
            ],
            bankAccounts: ['ES1234567890123456789012'],
            comments: ['Cliente VIP'],
            authorized: 'María Pérez',
            businessName: 'Empresa Test SL',
        };
        mockRepository.create.mockResolvedValue(undefined);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(clientData, mockCurrentUser);
        expect(checkRolePermission_1.checkRolePermission).toHaveBeenCalledWith(mockCurrentUser, expect.any(Array), 'crear clientes');
        expect(mockRepository.create).toHaveBeenCalledTimes(1);
        expect(mockRepository.create).toHaveBeenCalledWith(expect.any(Client_1.Client));
        expect(prometheusMetrics_1.businessClientsCreated.inc).toHaveBeenCalledTimes(1);
        expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Creando cliente: Juan Pérez'));
        expect(logger_1.default.info).toHaveBeenCalledWith(expect.stringContaining('Cliente creado exitosamente'));
        // Verificar propiedades del cliente creado
        expect(result).toBeInstanceOf(Client_1.Client);
        expect(result.firstName).toBe('Juan');
        expect(result.lastName).toBe('Pérez');
        expect(result.dni).toBe('12345678A');
        expect(result.email).toBe('juan@example.com');
        expect(result.birthday).toBe('1990-01-01');
        expect(result.phones).toEqual(['123456789']);
        expect(result.addresses).toEqual([
            {
                address: 'Calle Test 123',
                cupsLuz: 'ES0123456789012345AB',
                cupsGas: 'ES9876543210987654CD',
            },
        ]);
        expect(result.bankAccounts).toEqual(['ES1234567890123456789012']);
        expect(result.comments).toEqual(['Cliente VIP']);
        expect(result.authorized).toBe('María Pérez');
        expect(result.businessName).toBe('Empresa Test SL');
        expect(result.id).toBeDefined();
        expect(result.createdAt).toBeInstanceOf(Date);
        expect(result.lastModified).toBeInstanceOf(Date);
    });
    it('debería crear un cliente con datos mínimos', async () => {
        const clientData = {
            firstName: 'Ana',
            lastName: 'García',
            dni: '87654321B',
            email: 'ana@example.com',
            birthday: '1985-05-15',
        };
        mockRepository.create.mockResolvedValue(undefined);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute(clientData, mockCurrentUser);
        expect(mockRepository.create).toHaveBeenCalledTimes(1);
        expect(result.firstName).toBe('Ana');
        expect(result.lastName).toBe('García');
        expect(result.dni).toBe('87654321B');
        expect(result.phones).toEqual([]);
        expect(result.addresses).toEqual([]);
        expect(result.bankAccounts).toEqual([]);
        expect(result.comments).toEqual([]);
        expect(result.authorized).toBeUndefined();
        expect(result.businessName).toBeUndefined();
    });
    it('debería lanzar error si el usuario no tiene permisos', async () => {
        const clientData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            dni: '12345678A',
            email: 'juan@example.com',
            birthday: '1990-01-01',
        };
        checkRolePermission_1.checkRolePermission.mockImplementation(() => {
            throw new Error('Sin permisos para crear clientes');
        });
        await expect(useCase.execute(clientData, mockCurrentUser)).rejects.toThrow('Sin permisos para crear clientes');
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(prometheusMetrics_1.businessClientsCreated.inc).not.toHaveBeenCalled();
    });
    it('debería lanzar error si falla la creación en el repositorio', async () => {
        const clientData = {
            firstName: 'Juan',
            lastName: 'Pérez',
            dni: '12345678A',
            email: 'juan@example.com',
            birthday: '1990-01-01',
        };
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        mockRepository.create.mockRejectedValue(new Error('Error de base de datos'));
        await expect(useCase.execute(clientData, mockCurrentUser)).rejects.toThrow('Error de base de datos');
        expect(mockRepository.create).toHaveBeenCalledTimes(1);
        // La métrica no se debería incrementar si hay error
        expect(prometheusMetrics_1.businessClientsCreated.inc).not.toHaveBeenCalled();
    });
});
