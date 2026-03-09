import { Request, Response } from 'express';
import path from 'path';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import logger from '@infrastructure/observability/logger/logger';

const RECORDS_DIR = process.env.RECORDS_PATH || './records';

export class RecordingController {
  static async uploadRecording(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      }

      const dto = {
        saleId,
        filename: file.originalname,
        storagePath: `${saleId}/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
      };

      const recording = await serviceContainer.uploadRecordingUseCase.execute(dto, currentUser);

      return res.status(201).json({
        message: 'Grabación subida correctamente',
        recording: recording.toPrisma(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('permiso')) return res.status(403).json({ message: msg });
      if (msg.includes('no encontrada')) return res.status(404).json({ message: msg });
      logger.error('Error en uploadRecording:', { error: msg });
      return res.status(500).json({ message: msg });
    }
  }

  static async listRecordings(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { saleId } = req.params;

      const recordings = await serviceContainer.listRecordingsUseCase.execute(saleId, currentUser);

      return res.status(200).json(recordings.map((r) => r.toPrisma()));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('permiso')) return res.status(403).json({ message: msg });
      if (msg.includes('no encontrada')) return res.status(404).json({ message: msg });
      return res.status(500).json({ message: msg });
    }
  }

  static async downloadRecording(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { recordingId } = req.params;

      const recording = await serviceContainer.downloadRecordingUseCase.execute(
        recordingId,
        currentUser
      );

      // Validar path traversal: asegurar que el archivo está dentro de RECORDS_DIR
      const resolvedRecordsDir = path.resolve(RECORDS_DIR);
      const filePath = path.resolve(RECORDS_DIR, recording.storagePath);

      if (!filePath.startsWith(resolvedRecordsDir + path.sep)) {
        return res.status(403).json({ message: 'Acceso denegado: ruta inválida' });
      }

      res.setHeader('Content-Type', recording.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${recording.filename}"`);

      return res.download(filePath, recording.filename);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('permiso')) return res.status(403).json({ message: msg });
      if (msg.includes('no encontrada')) return res.status(404).json({ message: msg });
      return res.status(500).json({ message: msg });
    }
  }

  static async deleteRecording(req: Request, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) return res.status(401).json({ message: 'No autorizado' });

      const { recordingId } = req.params;

      await serviceContainer.deleteRecordingUseCase.execute(recordingId, currentUser);

      return res.status(200).json({ message: 'Grabación eliminada correctamente' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      if (msg.includes('permiso')) return res.status(403).json({ message: msg });
      if (msg.includes('no encontrada')) return res.status(404).json({ message: msg });
      return res.status(500).json({ message: msg });
    }
  }
}
