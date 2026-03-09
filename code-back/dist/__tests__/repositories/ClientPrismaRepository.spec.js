"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClientPrismaRepository_1 = require("../../infrastructure/prisma/ClientPrismaRepository");
const prismaClient_1 = require("../../infrastructure/prisma/prismaClient");
const Client_1 = require("../../domain/entities/Client");
jest.mock('@infrastructure/prisma/prismaClient', () => ({
    prisma: {
        client: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));
describe('ClientPrismaRepository', () => {
    let repository;
    const mockClientData = {
        id: 'client-123',
        firstName: 'John',
        lastName: 'Doe',
        dni: '12345678',
        email: 'john@example.com',
        birthday: '1990-01-01',
        phones: ['1234567890'],
        addresses: [],
        bankAccounts: [],
        comments: [],
        authorized: 'true',
        businessName: 'Doe Corp',
        createdAt: new Date('2024-01-01'),
        lastModified: new Date('2024-01-02'),
    };
    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ClientPrismaRepository_1.ClientPrismaRepository();
    });
    describe('getById', () => {
        it('should get client by id', async () => {
            prismaClient_1.prisma.client.findUnique.mockResolvedValue(mockClientData);
            const result = await repository.getById('client-123');
            expect(result).toBeInstanceOf(Client_1.Client);
            expect(result?.id).toBe('client-123');
            expect(prismaClient_1.prisma.client.findUnique).toHaveBeenCalledWith({
                where: { id: 'client-123' },
            });
        });
        it('should return null when client not found', async () => {
            prismaClient_1.prisma.client.findUnique.mockResolvedValue(null);
            const result = await repository.getById('nonexistent');
            expect(result).toBeNull();
        });
        it('should handle null authorized as undefined', async () => {
            const clientWithNulls = { ...mockClientData, authorized: null, businessName: null };
            prismaClient_1.prisma.client.findUnique.mockResolvedValue(clientWithNulls);
            const result = await repository.getById('client-123');
            expect(result).toBeInstanceOf(Client_1.Client);
        });
        it('should handle get by id errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.client.findUnique.mockRejectedValue(error);
            await expect(repository.getById('client-123')).rejects.toThrow(error);
        });
    });
    describe('create', () => {
        it('should create a client', async () => {
            const client = Client_1.Client.fromPrisma(mockClientData);
            prismaClient_1.prisma.client.create.mockResolvedValue(mockClientData);
            await repository.create(client);
            expect(prismaClient_1.prisma.client.create).toHaveBeenCalledWith({
                data: client.toPrisma(),
            });
        });
        it('should handle creation errors', async () => {
            const client = Client_1.Client.fromPrisma(mockClientData);
            const error = new Error('Duplicate key error');
            prismaClient_1.prisma.client.create.mockRejectedValue(error);
            await expect(repository.create(client)).rejects.toThrow(error);
        });
    });
    describe('update', () => {
        it('should update a client', async () => {
            const client = Client_1.Client.fromPrisma(mockClientData);
            prismaClient_1.prisma.client.update.mockResolvedValue(mockClientData);
            await repository.update(client);
            expect(prismaClient_1.prisma.client.update).toHaveBeenCalledWith({
                where: { id: client.id },
                data: client.toPrisma(),
            });
        });
        it('should handle update errors', async () => {
            const client = Client_1.Client.fromPrisma(mockClientData);
            const error = new Error('Client not found');
            prismaClient_1.prisma.client.update.mockRejectedValue(error);
            await expect(repository.update(client)).rejects.toThrow(error);
        });
    });
    describe('getByPhoneOrDNI', () => {
        it('should find clients by phone', async () => {
            prismaClient_1.prisma.client.findMany.mockResolvedValue([mockClientData]);
            const result = await repository.getByPhoneOrDNI('1234567890');
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Client_1.Client);
            expect(prismaClient_1.prisma.client.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [{ phones: { has: '1234567890' } }, { dni: '1234567890' }],
                },
            });
        });
        it('should find clients by DNI', async () => {
            prismaClient_1.prisma.client.findMany.mockResolvedValue([mockClientData]);
            const result = await repository.getByPhoneOrDNI('12345678');
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Client_1.Client);
        });
        it('should return empty array when no clients found', async () => {
            prismaClient_1.prisma.client.findMany.mockResolvedValue([]);
            const result = await repository.getByPhoneOrDNI('nonexistent');
            expect(result).toEqual([]);
        });
        it('should find multiple clients', async () => {
            const client2 = { ...mockClientData, id: 'client-456' };
            prismaClient_1.prisma.client.findMany.mockResolvedValue([mockClientData, client2]);
            const result = await repository.getByPhoneOrDNI('1234567890');
            expect(result).toHaveLength(2);
        });
        it('should handle null values in results', async () => {
            const clientWithNulls = { ...mockClientData, authorized: null, businessName: null };
            prismaClient_1.prisma.client.findMany.mockResolvedValue([clientWithNulls]);
            const result = await repository.getByPhoneOrDNI('1234567890');
            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(Client_1.Client);
        });
        it('should handle search errors', async () => {
            const error = new Error('Database error');
            prismaClient_1.prisma.client.findMany.mockRejectedValue(error);
            await expect(repository.getByPhoneOrDNI('1234567890')).rejects.toThrow(error);
        });
    });
});
