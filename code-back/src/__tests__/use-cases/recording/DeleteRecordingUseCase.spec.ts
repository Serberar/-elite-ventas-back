import { DeleteRecordingUseCase } from '@application/use-cases/recording/DeleteRecordingUseCase';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { ISaleRepository } from '@domain/repositories/ISaleRepository';
import { Recording } from '@domain/entities/Recording';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';
import fs from 'fs';

jest.mock('fs');

describe('DeleteRecordingUseCase', () => {
  let useCase: DeleteRecordingUseCase;
  let mockRecordingRepo: jest.Mocked<IRecordingRepository>;
  let mockSaleRepo: jest.Mocked<ISaleRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
    empresaId: '00000000-0000-0000-0000-000000000001',
  };

  const mockRecording = new Recording(
    'rec-1', 'sale-123', 'call.mp3', 'call.mp3',
    'audio/mpeg', 1024000, 'user-123', new Date('2024-01-01')
  );

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

    useCase = new DeleteRecordingUseCase(mockRecordingRepo, mockSaleRepo);
  });

  describe('execute', () => {
    it('should delete recording and file when file exists', async () => {
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      mockRecordingRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('rec-1', mockUser);

      expect(mockRecordingRepo.findById).toHaveBeenCalledWith('rec-1');
      expect(mockRecordingRepo.delete).toHaveBeenCalledWith('rec-1');
      expect(mockSaleRepo.addHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: 'sale-123',
          userId: 'user-123',
          action: 'delete_recording',
        })
      );
    });

    it('should skip file deletion if file does not exist', async () => {
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockRecordingRepo.delete.mockResolvedValue(undefined);
      mockSaleRepo.addHistory.mockResolvedValue({} as any);

      await useCase.execute('rec-1', mockUser);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(mockRecordingRepo.delete).toHaveBeenCalledWith('rec-1');
    });

    it('should throw NotFoundError when recording does not exist', async () => {
      mockRecordingRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', mockUser)).rejects.toThrow(NotFoundError);
      expect(mockRecordingRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw AuthorizationError for coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('rec-1', coordinadorUser)).rejects.toThrow(AuthorizationError);
      expect(mockRecordingRepo.delete).not.toHaveBeenCalled();
    });

    it('should also throw AuthorizationError for coordinador role (duplicate check)', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'coordinador', firstName: 'V', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('rec-1', verificadorUser)).rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com', empresaId: '00000000-0000-0000-0000-000000000001' };

      await expect(useCase.execute('rec-1', comercialUser)).rejects.toThrow(AuthorizationError);
    });

    it('should reject path traversal attempts', async () => {
      const maliciousRecording = new Recording(
        'rec-evil', 'sale-123', 'evil.mp3', '../../../etc/passwd',
        'audio/mpeg', 100, 'user-123', new Date()
      );

      mockRecordingRepo.findById.mockResolvedValue(maliciousRecording);

      await expect(useCase.execute('rec-evil', mockUser)).rejects.toThrow(AuthorizationError);
    });
  });
});
