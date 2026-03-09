"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GetClientUseCase_1 = require("../../../application/use-cases/client/GetClientUseCase");
const Client_1 = require("../../../domain/entities/Client");
const checkRolePermission_1 = require("../../../application/shared/authorization/checkRolePermission");
jest.mock('@application/shared/authorization/checkRolePermission');
describe('GetClientUseCase', () => {
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
            role: 'comercial',
        };
        useCase = new GetClientUseCase_1.GetClientUseCase(mockRepository);
        jest.clearAllMocks();
    });
    it('debería devolver clientes cuando se encuentran por DNI', async () => {
        const mockClients = [
            new Client_1.Client('client-1', 'Juan', 'Pérez', '12345678A', 'juan@example.com', '1990-01-01', ['123456789'], [], [], [], undefined, undefined, new Date(), new Date()),
        ];
        mockRepository.getByPhoneOrDNI.mockResolvedValue(mockClients);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute('12345678A', mockCurrentUser);
        expect(checkRolePermission_1.checkRolePermission).toHaveBeenCalledWith(mockCurrentUser, expect.any(Array), 'descargar clientes por teléfono o DNI');
        expect(mockRepository.getByPhoneOrDNI).toHaveBeenCalledWith('12345678A');
        expect(result).toEqual(mockClients);
        expect(result).toHaveLength(1);
        expect(result[0].dni).toBe('12345678A');
    });
    it('debería devolver clientes cuando se encuentran por teléfono', async () => {
        const mockClients = [
            new Client_1.Client('client-1', 'Ana', 'García', '87654321B', 'ana@example.com', '1985-05-15', ['987654321'], [], [], [], undefined, undefined, new Date(), new Date()),
            new Client_1.Client('client-2', 'Carlos', 'López', '11223344C', 'carlos@example.com', '1992-03-20', ['987654321'], [], [], [], undefined, undefined, new Date(), new Date()),
        ];
        mockRepository.getByPhoneOrDNI.mockResolvedValue(mockClients);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute('987654321', mockCurrentUser);
        expect(mockRepository.getByPhoneOrDNI).toHaveBeenCalledWith('987654321');
        expect(result).toEqual(mockClients);
        expect(result).toHaveLength(2);
        expect(result[0].phones).toContain('987654321');
        expect(result[1].phones).toContain('987654321');
    });
    it('debería devolver array vacío cuando no se encuentran clientes', async () => {
        mockRepository.getByPhoneOrDNI.mockResolvedValue([]);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute('99999999Z', mockCurrentUser);
        expect(mockRepository.getByPhoneOrDNI).toHaveBeenCalledWith('99999999Z');
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
    });
    it('debería devolver array vacío cuando el repositorio devuelve null', async () => {
        mockRepository.getByPhoneOrDNI.mockResolvedValue(null);
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        const result = await useCase.execute('99999999Z', mockCurrentUser);
        expect(result).toEqual([]);
    });
    it('debería lanzar error si el usuario no tiene permisos', async () => {
        checkRolePermission_1.checkRolePermission.mockImplementation(() => {
            throw new Error('Sin permisos para descargar clientes por teléfono o DNI');
        });
        await expect(useCase.execute('12345678A', mockCurrentUser)).rejects.toThrow('Sin permisos para descargar clientes por teléfono o DNI');
        expect(mockRepository.getByPhoneOrDNI).not.toHaveBeenCalled();
    });
    it('debería lanzar error si falla la consulta en el repositorio', async () => {
        checkRolePermission_1.checkRolePermission.mockReturnValue(true);
        mockRepository.getByPhoneOrDNI.mockRejectedValue(new Error('Error de base de datos'));
        await expect(useCase.execute('12345678A', mockCurrentUser)).rejects.toThrow('Error de base de datos');
        expect(mockRepository.getByPhoneOrDNI).toHaveBeenCalledWith('12345678A');
    });
});
