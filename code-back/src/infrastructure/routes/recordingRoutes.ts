import { Router } from 'express';
import { RecordingController } from '@infrastructure/express/controllers/RecordingController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { uploadRecording } from '@infrastructure/express/middleware/uploadMiddleware';

const router = Router();

// Subir grabación a una venta
router.post(
  '/:saleId/recordings',
  authMiddleware,
  uploadRecording.single('file'),
  RecordingController.uploadRecording.bind(RecordingController)
);

// Listar grabaciones de una venta
router.get(
  '/:saleId/recordings',
  authMiddleware,
  RecordingController.listRecordings.bind(RecordingController)
);

// Descargar una grabación
router.get(
  '/:saleId/recordings/:recordingId',
  authMiddleware,
  RecordingController.downloadRecording.bind(RecordingController)
);

// Eliminar una grabación
router.delete(
  '/:saleId/recordings/:recordingId',
  authMiddleware,
  RecordingController.deleteRecording.bind(RecordingController)
);

export default router;
