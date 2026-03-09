import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ContractConfigController } from '@infrastructure/express/controllers/ContractConfigController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { uploadLogo } from '@infrastructure/express/middleware/uploadMiddleware';

const router = Router();

/** Convierte MulterError en respuesta 400 en lugar de 500 */
function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El fichero es demasiado grande. Tamaño máximo: 2 MB.' });
    }
    return res.status(400).json({ message: `Error al subir fichero: ${err.message}` });
  }
  if (err instanceof Error && err.message.includes('Tipo de imagen')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
}

// GET /api/contract-config — leer configuración completa
router.get('/', authMiddleware, ContractConfigController.getConfig);

// PATCH /api/contract-config — guardar textos / páginas extra
router.patch('/', authMiddleware, ContractConfigController.saveConfig);

// GET /api/contract-config/logo — servir el fichero de logo
router.get('/logo', authMiddleware, ContractConfigController.getLogo);

// POST /api/contract-config/logo — subir nuevo logo
router.post(
  '/logo',
  authMiddleware,
  uploadLogo.single('logo'),
  multerErrorHandler,
  ContractConfigController.uploadLogo
);

// DELETE /api/contract-config/logo — eliminar logo
router.delete('/logo', authMiddleware, ContractConfigController.deleteLogo);

export default router;
