import { UploadRecordingUseCase } from '@application/use-cases/recording/UploadRecordingUseCase';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Recording } from '@domain/entities/Recording';
import { Sale } from '@domain/entities/Sale';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

describe('UploadRecordingUseCase', () => {
  let useCase: UploadRecordingUseCase;
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

  const mockRecording = new Recording(
    'rec-1', 'sale-123', 'call.mp3', 'recordings/sale-123/call.mp3',
    'audio/mpeg', 1024000, 'user-123', new Date('2024-01-01')
  );

  const uploadDto = {
    saleId: 'sale-123',
    filename: 'call.mp3',
    storagePath: 'recordings/sale-123/call.mp3',
    mimeType: 'audio/mpeg',
    size: 1024000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRecordingRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySaleId: jest.fn(),
      delete: jest.fn(),
    };

    mockSaleRepo = {
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
    } as jest.Mocked<ISaleRepository>;

    useCase = new UploadRecordingUseCase(mockRecordingRepo, mockSaleRepo);
  });

  describe('execute', () => {
    it('should upload recording successfully', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.create.mockResolvedValue(mockRecording);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute(uploadDto, mockUser);

      expect(result).toEqual(mockRecording);
      expect(mockSaleRepo.findById).toHaveBeenCalledWith('sale-123');
      expect(mockRecordingRepo.create).toHaveBeenCalledWith({
        saleId: 'sale-123',
        filename: 'call.mp3',
        storagePath: 'recordings/sale-123/call.mp3',
        mimeType: 'audio/mpeg',
        size: 1024000,
        uploadedById: 'user-123',
      });
    });

    it('should add history after upload', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.create.mockResolvedValue(mockRecording);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute(uploadDto, mockUser);

      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith({
        saleId: 'sale-123',
        userId: 'user-123',
        action: 'upload_recording',
        payload: {
          recordingId: 'rec-1',
          filename: 'call.mp3',
        },
      });
    });

    it('should throw NotFoundError when sale does not exist', async () => {
      mockSaleRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute(uploadDto, mockUser)).rejects.toThrow(NotFoundError);
      expect(mockRecordingRepo.create).not.toHaveBeenCalled();
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.create.mockResolvedValue(mockRecording);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute(uploadDto, coordinadorUser);

      expect(result).toEqual(mockRecording);
    });

    it('should work with coordinador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.create.mockResolvedValue(mockRecording);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      const result = await useCase.execute(uploadDto, verificadorUser);

      expect(result).toEqual(mockRecording);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute(uploadDto, comercialUser)).rejects.toThrow(AuthorizationError);
    });

    it('should handle repository errors on create', async () => {
      mockSaleRepo.findById.mockResolvedValue(mockSale);
      mockRecordingRepo.create.mockRejectedValue(new Error('Storage error'));

      await expect(useCase.execute(uploadDto, mockUser)).rejects.toThrow('Storage error');
    });
  });
});
