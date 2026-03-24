import { ListRecordingsUseCase } from '@application/use-cases/recording/ListRecordingsUseCase';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Recording } from '@domain/entities/Recording';
import { Sale } from '@domain/entities/Sale';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

const saleRepoMethods = {
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

describe('ListRecordingsUseCase', () => {
  let useCase: ListRecordingsUseCase;
  let mockRecordingRepo: jest.Mocked<IRecordingRepository>;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockSale = new Sale(
    'sale-123', 'client-1', 'status-1', 100, null, null, null, null, null,
    new Date('2024-01-01'), new Date('2024-01-01'), null
  );

  const mockRecordings: Recording[] = [
    new Recording('rec-1', 'sale-123', 'call1.mp3', 'recordings/call1.mp3', 'audio/mpeg', 1024000, 'user-123', new Date('2024-01-01')),
    new Recording('rec-2', 'sale-123', 'call2.mp3', 'recordings/call2.mp3', 'audio/mpeg', 2048000, 'user-456', new Date('2024-01-02')),
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockRecordingRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySaleId: jest.fn(),
      delete: jest.fn(),
    };

    mockSaleRepo = { ...saleRepoMethods } as jest.Mocked<ISaleRepository>;
    Object.keys(saleRepoMethods).forEach((key) => {
      (mockSaleRepo as any)[key] = jest.fn();
    });

    useCase = new ListRecordingsUseCase(mockRecordingRepo, mockSaleRepo);
  });

  describe('execute', () => {
    it('should return recordings for an existing sale', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.findBySaleId.mockResolvedValue(mockRecordings);

      const result = await useCase.execute('sale-123', mockUser);

      expect(result).toEqual(mockRecordings);
      expect(result.length).toBe(2);
      expect(mockSaleRepo.findById).toHaveBeenCalledWith('sale-123');
      expect(mockRecordingRepo.findBySaleId).toHaveBeenCalledWith('sale-123');
    });

    it('should return empty array when no recordings exist', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.findBySaleId.mockResolvedValue([]);

      const result = await useCase.execute('sale-123', mockUser);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when sale does not exist', async () => {
      mockSaleRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', mockUser)).rejects.toThrow(NotFoundError);
      expect(mockRecordingRepo.findBySaleId).not.toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.findBySaleId.mockResolvedValue(mockRecordings);

      const result = await useCase.execute('sale-123', coordinadorUser);

      expect(result).toEqual(mockRecordings);
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.findBySaleId.mockResolvedValue(mockRecordings);

      const result = await useCase.execute('sale-123', verificadorUser);

      expect(result).toEqual(mockRecordings);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('sale-123', comercialUser)).rejects.toThrow(AuthorizationError);
    });

    it('should handle repository errors', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.findBySaleId.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('sale-123', mockUser)).rejects.toThrow('DB error');
    });
  });
});
