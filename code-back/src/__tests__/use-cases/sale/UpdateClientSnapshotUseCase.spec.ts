import { UpdateClientSnapshotUseCase } from '@application/use-cases/sale/UpdateClientSnapshotUseCase';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Sale } from '@domain/entities/Sale';
import { SaleStatus } from '@domain/entities/SaleStatus';
import { SaleItem } from '@domain/entities/SaleItem';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError, DatabaseError } from '@application/shared/AppError';

describe('UpdateClientSnapshotUseCase', () => {
  let useCase: UpdateClientSnapshotUseCase;
  let mockRepository: jest.Mocked<ISaleRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockSale = new Sale(
    'sale-123', 'client-1', 'status-1', 100, null, null,
    { firstName: 'John', lastName: 'Doe' }, null, null,
    new Date('2024-01-01'), new Date('2024-01-01'), null, '00000000-0000-0000-0000-000000000001'
  );

  const mockClientSnapshot = { firstName: 'Jane', lastName: 'Smith', dni: '12345678Z' };

  const mockStatus = new SaleStatus('status-1', 'Inicial', 1, '#FFF', false, false, true);

  const mockItem = new SaleItem(
    'item-1', 'sale-123', 'prod-1', 'Product', 'SKU-1', 100, 1, 100,
    new Date(), new Date()
  );

  const mockRelations = {
    sale: mockSale,
    status: mockStatus,
    items: [mockItem],
    assignments: [],
    histories: [],
    signatureRequest: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findWithRelations: jest.fn(),
      update: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      addHistory: jest.fn(),
      list: jest.fn(),
      listPaginated: jest.fn(),
      listWithRelations: jest.fn(),
      listPaginatedWithRelations: jest.fn(),
      createWithItemsTransaction: jest.fn(),
      assignUser: jest.fn(),
      updateClientSnapshot: jest.fn(),
      getDistinctComerciales: jest.fn(),
    };

    useCase = new UpdateClientSnapshotUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should update client snapshot successfully', async () => {
      mockRepository.findById.mockResolvedValue(mockSale);
      mockRepository.updateClientSnapshot.mockResolvedValue(mockSale);
      mockRepository.addHistory.mockResolvedValue({} as any);
      mockRepository.findWithRelations.mockResolvedValue(mockRelations as any);

      const result = await useCase.execute('sale-123', mockClientSnapshot, mockUser);

      expect(mockRepository.findById).toHaveBeenCalledWith('sale-123');
      expect(mockRepository.updateClientSnapshot).toHaveBeenCalledWith(
        'sale-123',
        mockClientSnapshot,
        undefined
      );
      expect(mockRepository.addHistory).toHaveBeenCalledWith(expect.objectContaining({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'update_client_snapshot',
      }));
      expect(result).toBeDefined();
    });

    it('should update client snapshot with comercial', async () => {
      mockRepository.findById.mockResolvedValue(mockSale);
      mockRepository.updateClientSnapshot.mockResolvedValue(mockSale);
      mockRepository.addHistory.mockResolvedValue({} as any);
      mockRepository.findWithRelations.mockResolvedValue(mockRelations as any);

      await useCase.execute('sale-123', mockClientSnapshot, mockUser, 'agente-pedro');

      expect(mockRepository.updateClientSnapshot).toHaveBeenCalledWith(
        'sale-123',
        mockClientSnapshot,
        'agente-pedro'
      );
    });

    it('should throw NotFoundError when sale does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent', mockClientSnapshot, mockUser)
      ).rejects.toThrow(NotFoundError);
      expect(mockRepository.updateClientSnapshot).not.toHaveBeenCalled();
    });

    it('should throw DatabaseError when updated sale cannot be retrieved', async () => {
      mockRepository.findById.mockResolvedValue(mockSale);
      mockRepository.updateClientSnapshot.mockResolvedValue(mockSale);
      mockRepository.addHistory.mockResolvedValue({} as any);
      mockRepository.findWithRelations.mockResolvedValue(null);

      await expect(
        useCase.execute('sale-123', mockClientSnapshot, mockUser)
      ).rejects.toThrow(DatabaseError);
    });

    it('should return structured response with all relations', async () => {
      mockRepository.findById.mockResolvedValue(mockSale);
      mockRepository.updateClientSnapshot.mockResolvedValue(mockSale);
      mockRepository.addHistory.mockResolvedValue({} as any);
      mockRepository.findWithRelations.mockResolvedValue(mockRelations as any);

      const result = await useCase.execute('sale-123', mockClientSnapshot, mockUser);

      expect(result).toHaveProperty('client', mockClientSnapshot);
      expect(result).toHaveProperty('status', mockStatus);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('assignments');
      expect(result).toHaveProperty('histories');
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(
        useCase.execute('sale-123', mockClientSnapshot, comercialUser)
      ).rejects.toThrow(AuthorizationError);
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockRepository.findById.mockResolvedValue(mockSale);
      mockRepository.updateClientSnapshot.mockResolvedValue(mockSale);
      mockRepository.addHistory.mockResolvedValue({} as any);
      mockRepository.findWithRelations.mockResolvedValue(mockRelations as any);

      const result = await useCase.execute('sale-123', mockClientSnapshot, coordinadorUser);

      expect(result).toBeDefined();
    });
  });
});
