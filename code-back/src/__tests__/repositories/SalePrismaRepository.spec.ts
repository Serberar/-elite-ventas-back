import { SalePrismaRepository } from '@infrastructure/prisma/SalePrismaRepository';
import { prisma } from '@infrastructure/prisma/prismaClient';
import { Prisma } from '@prisma/client';
import { Sale } from '@domain/entities/Sale';
import { SaleItem } from '@domain/entities/SaleItem';
import { SaleHistory } from '@domain/entities/SaleHistory';
import { SaleAssignment } from '@domain/entities/SaleAssignment';

jest.mock('@infrastructure/prisma/prismaClient', () => ({
  prisma: {
    sale: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    saleItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    saleHistory: {
      create: jest.fn(),
    },
    saleAssignment: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@infrastructure/resilience', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn: () => Promise<any>) => fn()),
  },
}));

describe('SalePrismaRepository', () => {
  let repository: SalePrismaRepository;

  const mockClientSnapshot = {
    firstName: 'John',
    lastName: 'Doe',
    dni: '12345678A',
    email: 'john@example.com',
  };

  const mockAddressSnapshot = {
    address: 'Calle Test 123',
    cupsLuz: 'ES001',
    cupsGas: 'ES002',
  };

  const mockSaleData = {
    id: 'sale-123',
    clientId: 'client-123',
    statusId: 'status-123',
    totalAmount: 100,
    notes: null,
    metadata: null,
    clientSnapshot: mockClientSnapshot,
    addressSnapshot: mockAddressSnapshot,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    closedAt: null,
  };

  const mockItemData = {
    id: 'item-123',
    saleId: 'sale-123',
    productId: 'product-123',
    nameSnapshot: 'Product Name',
    skuSnapshot: 'SKU-123',
    unitPrice: 50,
    quantity: 2,
    finalPrice: 100,
    createdAt: new Date('2024-01-01'),
    updatedAt: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SalePrismaRepository();
  });

  describe('create', () => {
    it('should create sale with all fields', async () => {
      const notes = [{ note: 'Test note' }];
      const metadata = { key: 'value' };
      (prisma.sale.create as jest.Mock).mockResolvedValue({
        ...mockSaleData,
        notes,
        metadata,
      });

      const result = await repository.create({
        clientId: 'client-123',
        statusId: 'status-123',
        totalAmount: 100,
        notes,
        metadata,
        clientSnapshot: mockClientSnapshot,
        addressSnapshot: mockAddressSnapshot,
      });

      expect(result).toBeInstanceOf(Sale);
      expect(prisma.sale.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client-123',
          statusId: 'status-123',
          totalAmount: 100,
          notes,
          metadata,
          clientSnapshot: mockClientSnapshot,
          addressSnapshot: mockAddressSnapshot,
          comercial: null,
        },
      });
    });

    it('should create sale with default values', async () => {
      (prisma.sale.create as jest.Mock).mockResolvedValue(mockSaleData);

      const result = await repository.create({
        clientId: 'client-123',
        statusId: 'status-123',
        clientSnapshot: mockClientSnapshot,
        addressSnapshot: mockAddressSnapshot,
      });

      expect(result).toBeInstanceOf(Sale);
      expect(prisma.sale.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client-123',
          statusId: 'status-123',
          totalAmount: 0,
          notes: Prisma.JsonNull,
          metadata: Prisma.JsonNull,
          clientSnapshot: mockClientSnapshot,
          addressSnapshot: mockAddressSnapshot,
          comercial: null,
        },
      });
    });

    it('should handle creation errors', async () => {
      const error = new Error('Foreign key constraint failed');
      (prisma.sale.create as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.create({
          clientId: 'client-123',
          statusId: 'status-123',
          clientSnapshot: mockClientSnapshot,
          addressSnapshot: mockAddressSnapshot,
        })
      ).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    it('should update sale with all fields', async () => {
      const updatedData = {
        ...mockSaleData,
        totalAmount: 200,
        closedAt: new Date('2024-01-03'),
      };
      (prisma.sale.update as jest.Mock).mockResolvedValue(updatedData);

      const result = await repository.update('sale-123', {
        statusId: 'status-456',
        totalAmount: 200,
        closedAt: new Date('2024-01-03'),
      });

      expect(result).toBeInstanceOf(Sale);
      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        data: {
          statusId: 'status-456',
          totalAmount: 200,
          notes: Prisma.JsonNull,
          metadata: Prisma.JsonNull,
          closedAt: new Date('2024-01-03'),
        },
      });
    });

    it('should update only provided fields', async () => {
      (prisma.sale.update as jest.Mock).mockResolvedValue(mockSaleData);

      await repository.update('sale-123', { totalAmount: 150 });

      expect(prisma.sale.update).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        data: {
          statusId: undefined,
          totalAmount: 150,
          notes: Prisma.JsonNull,
          metadata: Prisma.JsonNull,
          closedAt: undefined,
        },
      });
    });

    it('should handle update errors', async () => {
      const error = new Error('Sale not found');
      (prisma.sale.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.update('sale-123', { totalAmount: 100 })).rejects.toThrow(error);
    });
  });

  describe('findById', () => {
    it('should find sale by id', async () => {
      (prisma.sale.findUnique as jest.Mock).mockResolvedValue(mockSaleData);

      const result = await repository.findById('sale-123');

      expect(result).toBeInstanceOf(Sale);
      expect(result?.id).toBe('sale-123');
      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
      });
    });

    it('should return null when sale not found', async () => {
      (prisma.sale.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle find by id errors', async () => {
      const error = new Error('Database error');
      (prisma.sale.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.findById('sale-123')).rejects.toThrow(error);
    });
  });

  describe('findWithRelations', () => {
    it('should find sale with all relations', async () => {
      const mockSaleWithRelations = {
        ...mockSaleData,
        items: [mockItemData],
        assignments: [
          {
            id: 'assignment-123',
            saleId: 'sale-123',
            userId: 'user-123',
            role: 'comercial',
            createdAt: new Date('2024-01-01'),
          },
        ],
        histories: [
          {
            id: 'history-123',
            saleId: 'sale-123',
            userId: 'user-123',
            action: 'create',
            payload: null,
            createdAt: new Date('2024-01-01'),
            user: null,
          },
        ],
        client: null,
        status: null,
        signatureRequest: null,
      };

      (prisma.sale.findUnique as jest.Mock).mockResolvedValue(mockSaleWithRelations);

      const result = await repository.findWithRelations('sale-123');

      expect(result).not.toBeNull();
      expect(result?.sale).toBeInstanceOf(Sale);
      expect(result?.items).toHaveLength(1);
      expect(result?.items[0]).toBeInstanceOf(SaleItem);
      expect(result?.assignments).toHaveLength(1);
      expect(result?.assignments[0]).toBeInstanceOf(SaleAssignment);
      expect(result?.histories).toHaveLength(1);
      expect(result?.histories[0]).toBeInstanceOf(SaleHistory);
      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-123' },
        include: {
          items: true,
          assignments: true,
          histories: {
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'asc' },
          },
          client: true,
          status: true,
          signatureRequest: true,
        },
      });
    });

    it('should return null when sale not found', async () => {
      (prisma.sale.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findWithRelations('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle empty relations', async () => {
      const saleWithEmptyRelations = {
        ...mockSaleData,
        items: [],
        assignments: [],
        histories: [],
        client: null,
        status: null,
        signatureRequest: null,
      };

      (prisma.sale.findUnique as jest.Mock).mockResolvedValue(saleWithEmptyRelations);

      const result = await repository.findWithRelations('sale-123');

      expect(result).not.toBeNull();
      expect(result?.items).toEqual([]);
      expect(result?.assignments).toEqual([]);
      expect(result?.histories).toEqual([]);
    });

    it('should handle find with relations errors', async () => {
      const error = new Error('Database error');
      (prisma.sale.findUnique as jest.Mock).mockRejectedValue(error);

      await expect(repository.findWithRelations('sale-123')).rejects.toThrow(error);
    });
  });

  describe('list', () => {
    it('should list all sales without filters', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      const result = await repository.list({});

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Sale);
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: undefined,
          statusId: undefined,
          createdAt: undefined,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list sales filtered by clientId', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      const result = await repository.list({ clientId: 'client-123' });

      expect(result).toHaveLength(1);
      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-123',
          statusId: undefined,
          createdAt: undefined,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list sales filtered by statusId', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      await repository.list({ statusId: 'status-123' });

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: undefined,
          statusId: 'status-123',
          createdAt: undefined,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list sales filtered by date range', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      await repository.list({ from, to });

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: undefined,
          statusId: undefined,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list sales filtered by from date only', async () => {
      const from = new Date('2024-01-01');
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      await repository.list({ from });

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: undefined,
          statusId: undefined,
          createdAt: {
            gte: from,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should list sales with all filters', async () => {
      const filters = {
        clientId: 'client-123',
        statusId: 'status-123',
        from: new Date('2024-01-01'),
        to: new Date('2024-12-31'),
      };
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([mockSaleData]);

      await repository.list(filters);

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: {
          clientId: 'client-123',
          statusId: 'status-123',
          createdAt: {
            gte: filters.from,
            lte: filters.to,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no sales found', async () => {
      (prisma.sale.findMany as jest.Mock).mockResolvedValue([]);

      const result = await repository.list({});

      expect(result).toEqual([]);
    });

    it('should handle list errors', async () => {
      const error = new Error('Database error');
      (prisma.sale.findMany as jest.Mock).mockRejectedValue(error);

      await expect(repository.list({})).rejects.toThrow(error);
    });
  });

  describe('addItem', () => {
    it('should add item to sale', async () => {
      (prisma.saleItem.create as jest.Mock).mockResolvedValue(mockItemData);

      const result = await repository.addItem('sale-123', {
        productId: 'product-123',
        nameSnapshot: 'Product Name',
        skuSnapshot: 'SKU-123',
        unitPrice: 50,
        quantity: 2,
        finalPrice: 100,
      });

      expect(result).toBeInstanceOf(SaleItem);
      expect(prisma.saleItem.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          productId: 'product-123',
          nameSnapshot: 'Product Name',
          skuSnapshot: 'SKU-123',
          unitPrice: 50,
          quantity: 2,
          finalPrice: 100,
        },
      });
    });

    it('should add item with null productId and skuSnapshot', async () => {
      const itemWithNulls = { ...mockItemData, productId: null, skuSnapshot: null };
      (prisma.saleItem.create as jest.Mock).mockResolvedValue(itemWithNulls);

      const result = await repository.addItem('sale-123', {
        nameSnapshot: 'Product Name',
        unitPrice: 50,
        quantity: 2,
        finalPrice: 100,
      });

      expect(result).toBeInstanceOf(SaleItem);
      expect(prisma.saleItem.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          productId: null,
          nameSnapshot: 'Product Name',
          skuSnapshot: null,
          unitPrice: 50,
          quantity: 2,
          finalPrice: 100,
        },
      });
    });

    it('should handle add item errors', async () => {
      const error = new Error('Foreign key constraint failed');
      (prisma.saleItem.create as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.addItem('sale-123', {
          nameSnapshot: 'Test',
          unitPrice: 50,
          quantity: 1,
          finalPrice: 50,
        })
      ).rejects.toThrow(error);
    });
  });

  describe('updateItem', () => {
    it('should update item', async () => {
      const updatedItem = { ...mockItemData, unitPrice: 75, finalPrice: 150 };
      (prisma.saleItem.update as jest.Mock).mockResolvedValue(updatedItem);

      const result = await repository.updateItem('item-123', {
        unitPrice: 75,
        quantity: 2,
        finalPrice: 150,
      });

      expect(result).toBeInstanceOf(SaleItem);
      expect(prisma.saleItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          unitPrice: 75,
          quantity: 2,
          finalPrice: 150,
        },
      });
    });

    it('should update only provided fields', async () => {
      (prisma.saleItem.update as jest.Mock).mockResolvedValue(mockItemData);

      await repository.updateItem('item-123', { quantity: 3 });

      expect(prisma.saleItem.update).toHaveBeenCalledWith({
        where: { id: 'item-123' },
        data: {
          unitPrice: undefined,
          quantity: 3,
          finalPrice: undefined,
        },
      });
    });

    it('should handle update item errors', async () => {
      const error = new Error('Item not found');
      (prisma.saleItem.update as jest.Mock).mockRejectedValue(error);

      await expect(repository.updateItem('item-123', { quantity: 5 })).rejects.toThrow(error);
    });
  });

  describe('removeItem', () => {
    it('should remove item from sale', async () => {
      (prisma.saleItem.delete as jest.Mock).mockResolvedValue(mockItemData);

      await repository.removeItem('item-123');

      expect(prisma.saleItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
    });

    it('should handle remove item errors', async () => {
      const error = new Error('Item not found');
      (prisma.saleItem.delete as jest.Mock).mockRejectedValue(error);

      await expect(repository.removeItem('item-123')).rejects.toThrow(error);
    });
  });

  describe('addHistory', () => {
    it('should add history entry with all fields', async () => {
      const mockHistoryData = {
        id: 'history-123',
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'create',
        payload: { note: 'Created sale' },
        createdAt: new Date('2024-01-01'),
      };
      (prisma.saleHistory.create as jest.Mock).mockResolvedValue(mockHistoryData);

      const result = await repository.addHistory({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'create',
        payload: { note: 'Created sale' },
      });

      expect(result).toBeInstanceOf(SaleHistory);
      expect(prisma.saleHistory.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          userId: 'user-123',
          action: 'create',
          payload: { note: 'Created sale' },
        },
      });
    });

    it('should add history with null userId and payload', async () => {
      const mockHistoryData = {
        id: 'history-123',
        saleId: 'sale-123',
        userId: null,
        action: 'create',
        payload: null,
        createdAt: new Date('2024-01-01'),
      };
      (prisma.saleHistory.create as jest.Mock).mockResolvedValue(mockHistoryData);

      const result = await repository.addHistory({
        saleId: 'sale-123',
        action: 'create',
      });

      expect(result).toBeInstanceOf(SaleHistory);
      expect(prisma.saleHistory.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          userId: null,
          action: 'create',
          payload: Prisma.JsonNull,
        },
      });
    });

    it('should handle add history errors', async () => {
      const error = new Error('Foreign key constraint failed');
      (prisma.saleHistory.create as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.addHistory({ saleId: 'sale-123', action: 'create' })
      ).rejects.toThrow(error);
    });
  });

  describe('assignUser', () => {
    it('should assign user to sale', async () => {
      const mockAssignmentData = {
        id: 'assignment-123',
        saleId: 'sale-123',
        userId: 'user-123',
        role: 'comercial',
        createdAt: new Date('2024-01-01'),
      };
      (prisma.saleAssignment.create as jest.Mock).mockResolvedValue(mockAssignmentData);

      const result = await repository.assignUser({
        saleId: 'sale-123',
        userId: 'user-123',
        role: 'comercial',
      });

      expect(result).toBeInstanceOf(SaleAssignment);
      expect(prisma.saleAssignment.create).toHaveBeenCalledWith({
        data: {
          saleId: 'sale-123',
          userId: 'user-123',
          role: 'comercial',
        },
      });
    });

    it('should handle assign user errors', async () => {
      const error = new Error('Duplicate assignment');
      (prisma.saleAssignment.create as jest.Mock).mockRejectedValue(error);

      await expect(
        repository.assignUser({
          saleId: 'sale-123',
          userId: 'user-123',
          role: 'comercial',
        })
      ).rejects.toThrow(error);
    });
  });
});
