import { RecordingController } from '@infrastructure/express/controllers/RecordingController';
import { Request, Response } from 'express';
import { CurrentUser } from '@application/shared/types/CurrentUser';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { Recording } from '@domain/entities/Recording';

jest.mock('@infrastructure/container/ServiceContainer', () => ({
  serviceContainer: {
    uploadRecordingUseCase: { execute: jest.fn() },
    listRecordingsUseCase: { execute: jest.fn() },
    downloadRecordingUseCase: { execute: jest.fn() },
    deleteRecordingUseCase: { execute: jest.fn() },
  },
}));

jest.mock('@infrastructure/observability/logger/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

describe('RecordingController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let setHeaderMock: jest.Mock;
  let downloadMock: jest.Mock;

  const currentUser: CurrentUser = { id: 'user-1', role: 'administrador', firstName: 'Admin' };

  const mockRecording = new Recording(
    'rec-1', 'sale-123', 'llamada.mp3', 'sale-123/llamada.mp3',
    'audio/mpeg', 1024, 'user-1', new Date('2024-01-15')
  );

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn();
    setHeaderMock = jest.fn();
    downloadMock = jest.fn();
    res = { status: statusMock, json: jsonMock, setHeader: setHeaderMock, download: downloadMock };
    req = {
      user: currentUser,
      params: { saleId: 'sale-123', recordingId: 'rec-1' },
      body: {},
      socket: { remoteAddress: '192.168.1.1' } as any,
    };
    jest.clearAllMocks();
  });

  describe('uploadRecording', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await RecordingController.uploadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 400 if no file is provided', async () => {
      req.file = undefined;

      await RecordingController.uploadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No se ha proporcionado ningún archivo' });
    });

    it('should return 201 with recording on success', async () => {
      req.file = {
        originalname: 'llamada.mp3',
        filename: 'llamada.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      } as Express.Multer.File;
      (serviceContainer.uploadRecordingUseCase.execute as jest.Mock).mockResolvedValue(mockRecording);

      await RecordingController.uploadRecording(req as any, res as any);

      expect(serviceContainer.uploadRecordingUseCase.execute).toHaveBeenCalledWith(
        {
          saleId: 'sale-123',
          filename: 'llamada.mp3',
          storagePath: 'sale-123/llamada.mp3',
          mimeType: 'audio/mpeg',
          size: 1024,
        },
        currentUser
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Grabación subida correctamente',
        recording: mockRecording.toPrisma(),
      });
    });

    it('should return 403 when use case throws permission error', async () => {
      req.file = {
        originalname: 'llamada.mp3',
        filename: 'llamada.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      } as Express.Multer.File;
      (serviceContainer.uploadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso para subir grabaciones')
      );

      await RecordingController.uploadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 when sale is not found', async () => {
      req.file = {
        originalname: 'llamada.mp3',
        filename: 'llamada.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      } as Express.Multer.File;
      (serviceContainer.uploadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Venta no encontrada')
      );

      await RecordingController.uploadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic errors', async () => {
      req.file = {
        originalname: 'llamada.mp3',
        filename: 'llamada.mp3',
        mimetype: 'audio/mpeg',
        size: 1024,
      } as Express.Multer.File;
      (serviceContainer.uploadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await RecordingController.uploadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('listRecordings', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await RecordingController.listRecordings(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with recordings list on success', async () => {
      const recordings = [mockRecording];
      (serviceContainer.listRecordingsUseCase.execute as jest.Mock).mockResolvedValue(recordings);

      await RecordingController.listRecordings(req as any, res as any);

      expect(serviceContainer.listRecordingsUseCase.execute).toHaveBeenCalledWith('sale-123', currentUser);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([mockRecording.toPrisma()]);
    });

    it('should return 200 with empty array when no recordings', async () => {
      (serviceContainer.listRecordingsUseCase.execute as jest.Mock).mockResolvedValue([]);

      await RecordingController.listRecordings(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith([]);
    });

    it('should return 403 on permission error', async () => {
      (serviceContainer.listRecordingsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso para listar grabaciones')
      );

      await RecordingController.listRecordings(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 500 on generic errors', async () => {
      (serviceContainer.listRecordingsUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await RecordingController.listRecordings(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('downloadRecording', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await RecordingController.downloadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should download file with correct headers on success', async () => {
      (serviceContainer.downloadRecordingUseCase.execute as jest.Mock).mockResolvedValue(mockRecording);

      await RecordingController.downloadRecording(req as any, res as any);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="llamada.mp3"'
      );
      expect(downloadMock).toHaveBeenCalled();
    });

    it('should return 403 for path traversal attack', async () => {
      const maliciousRecording = new Recording(
        'rec-evil', 'sale-123', 'evil.mp3', '../etc/passwd',
        'audio/mpeg', 100, 'user-1', new Date()
      );
      (serviceContainer.downloadRecordingUseCase.execute as jest.Mock).mockResolvedValue(
        maliciousRecording
      );

      await RecordingController.downloadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Acceso denegado: ruta inválida' });
      expect(downloadMock).not.toHaveBeenCalled();
    });

    it('should return 403 on permission error', async () => {
      (serviceContainer.downloadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso para descargar grabaciones')
      );

      await RecordingController.downloadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 when recording is not found', async () => {
      (serviceContainer.downloadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Grabación no encontrada')
      );

      await RecordingController.downloadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic errors', async () => {
      (serviceContainer.downloadRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await RecordingController.downloadRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteRecording', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await RecordingController.deleteRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'No autorizado' });
    });

    it('should return 200 with success message on delete', async () => {
      (serviceContainer.deleteRecordingUseCase.execute as jest.Mock).mockResolvedValue(undefined);

      await RecordingController.deleteRecording(req as any, res as any);

      expect(serviceContainer.deleteRecordingUseCase.execute).toHaveBeenCalledWith('rec-1', currentUser);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Grabación eliminada correctamente' });
    });

    it('should return 403 on permission error', async () => {
      (serviceContainer.deleteRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('No tiene permiso para eliminar grabaciones')
      );

      await RecordingController.deleteRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 when recording is not found', async () => {
      (serviceContainer.deleteRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('Grabación no encontrada')
      );

      await RecordingController.deleteRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should return 500 on generic errors', async () => {
      (serviceContainer.deleteRecordingUseCase.execute as jest.Mock).mockRejectedValue(
        new Error('DB error')
      );

      await RecordingController.deleteRecording(req as any, res as any);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });
});
