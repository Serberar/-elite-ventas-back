import { DownloadRecordingUseCase } from '@application/use-cases/recording/DownloadRecordingUseCase';
import { IRecordingRepository } from '@domain/repositories/IRecordingRepository';
import { Recording } from '@domain/entities/Recording';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { AuthorizationError, NotFoundError } from '@application/shared/AppError';

describe('DownloadRecordingUseCase', () => {
  let useCase: DownloadRecordingUseCase;
  let mockRecordingRepo: jest.Mocked<IRecordingRepository>;

  const mockUser: CurrentUser = {
    id: 'user-123',
    role: 'administrador',
    firstName: 'Admin',
  };

  const mockRecording = new Recording(
    'rec-1', 'sale-123', 'call.mp3', 'recordings/call.mp3',
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

    useCase = new DownloadRecordingUseCase(mockRecordingRepo);
  });

  describe('execute', () => {
    it('should return recording when found', async () => {
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);

      const result = await useCase.execute('rec-1', mockUser);

      expect(result).toEqual(mockRecording);
      expect(mockRecordingRepo.findById).toHaveBeenCalledWith('rec-1');
    });

    it('should throw NotFoundError when recording does not exist', async () => {
      mockRecordingRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', mockUser)).rejects.toThrow(NotFoundError);
      await expect(useCase.execute('non-existent', mockUser)).rejects.toThrow(
        'Grabación con ID non-existent no encontrado'
      );
    });

    it('should work with coordinador role', async () => {
      const coordinadorUser: CurrentUser = { id: 'u2', role: 'coordinador', firstName: 'C' };
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);

      const result = await useCase.execute('rec-1', coordinadorUser);

      expect(result).toEqual(mockRecording);
    });

    it('should work with verificador role', async () => {
      const verificadorUser: CurrentUser = { id: 'u3', role: 'verificador', firstName: 'V' };
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);

      const result = await useCase.execute('rec-1', verificadorUser);

      expect(result).toEqual(mockRecording);
    });

    it('should throw AuthorizationError for comercial role', async () => {
      const comercialUser: CurrentUser = { id: 'u4', role: 'comercial', firstName: 'Com' };

      await expect(useCase.execute('rec-1', comercialUser)).rejects.toThrow(AuthorizationError);
      expect(mockRecordingRepo.findById).not.toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      mockRecordingRepo.findById.mockRejectedValue(new Error('DB error'));

      await expect(useCase.execute('rec-1', mockUser)).rejects.toThrow('DB error');
    });

    it('should return recording with correct metadata', async () => {
      mockRecordingRepo.findById.mockResolvedValue(mockRecording);

      const result = await useCase.execute('rec-1', mockUser);

      expect(result.storagePath).toBe('recordings/call.mp3');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.saleId).toBe('sale-123');
    });
  });
});
