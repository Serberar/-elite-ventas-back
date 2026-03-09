import { ClientPrismaRepository } from '@infrastructure/prisma/ClientPrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { Client } from '@domain/entities/Client';

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
  let repository: ClientPrismaRepository;

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
    repository = new ClientPrismaRepository();
  });

  describe('getById', () => {
    it('should get client by id', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClientData);

      const result = await repository.getById('client-123');

      expect(result).toBeInstanceOf(Client);
      expect(result?.id).toBe('client-123');
      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'client-123' },
      });
    });

    it('should return null when client not found', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.getById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle null authorized as undefined', async () => {
      const clientWithNulls = { ...mockClientData, authorized: null, businessName: null };
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(clientWithNulls);

      const result = await repository.getById('client-123');

      expect(result).toBeInstanceOf(Client);
    });

    it('should handle get by id errors', async () => {
      const error = new Error('Database error');
      (prisma.client.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.getById('client-123')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    it('should create a client', async () => {
      const client = Client.fromPrisma(mockClientData);
      (prisma.client.create as jest.Mock).mockResolvedValue(mockClientData);

      await repository.create(client);

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: client.toPrisma(),
      });
    });

    it('should handle creation errors', async () => {
      const client = Client.fromPrisma(mockClientData);
      const error = new Error('Duplicate key error');
      (prisma.client.create as jest.Mock).mockRejectedValue(error);

      await expect(repository.create(client)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update a client', async () => {
      const client = Client.fromPrisma(mockClientData);
      (prisma.client.update as jest.Mock).mockResolvedValue(mockClientData);

      await repository.update(client);

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: client.id },
        data: client.toPrisma(),
      });
    });

    it('should handle update errors', async () => {
      const client = Client.fromPrisma(mockClientData);
      const error = new Error('Client not found');
      (prisma.client.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update(client)).rejects.toThrow(error);
    });
  });

  describe('getByPhoneOrDNI', () => {
    it('should find clients by phone', async () => {
      (prisma.client.findMany as jest.Mock).mockResolvedValue([mockClientData]);

      const result = await repository.getByPhoneOrDNI('1234567890');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Client);
      expect(prisma.client.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ phones: { has: '1234567890' } }, { dni: '1234567890' }],
        },
      });
    });

    it('should find clients by DNI', async () => {
      (prisma.client.findMany as jest.Mock).mockResolvedValue([mockClientData]);

      const result = await repository.getByPhoneOrDNI('12345678');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Client);
    });

    it('should return empty array when no clients found', async () => {
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.getByPhoneOrDNI('nonexistent');

      expect(result).toEqual([]);
    });

    it('should find multiple clients', async () => {
      const client2 = { ...mockClientData, id: 'client-456' };
      (prisma.client.findMany as jest.Mock).mockResolvedValue([mockClientData, client2]);

      const result = await repository.getByPhoneOrDNI('1234567890');

      expect(result).toHaveLength(2);
    });

    it('should handle null values in results', async () => {
      const clientWithNulls = { ...mockClientData, authorized: null, businessName: null };
      (prisma.client.findMany as jest.Mock).mockResolvedValue([clientWithNulls]);

      const result = await repository.getByPhoneOrDNI('1234567890');

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Client);
    });

    it('should handle search errors', async () => {
      const error = new Error('Database error');
      (prisma.client.findMany as jest.Mock).mockRejectedValue(error);

      await expect(repository.getByPhoneOrDNI('1234567890')).rejects.toThrow(error);
    });
  });
});
