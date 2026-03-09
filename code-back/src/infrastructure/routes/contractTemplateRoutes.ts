import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ContractTemplateController } from '@infrastructure/express/controllers/ContractTemplateController';
import { authMiddleware } from '@infrastructure/express/middleware/authMiddleware';
import { uploadTemplateLogo } from '@infrastructure/express/middleware/uploadMiddleware';

const router = Router();

function multerErrorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'El fichero es demasiado grande. Tamaño máximo: 5 MB.' });
    }
    return res.status(400).json({ message: `Error al subir fichero: ${err.message}` });
  }
  if (err instanceof Error && err.message.includes('Tipo de imagen')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
}

// GET /api/contract-templates
router.get('/', authMiddleware, ContractTemplateController.list);

// POST /api/contract-templates
router.post('/', authMiddleware, ContractTemplateController.create);

// GET /api/contract-templates/:id
router.get('/:id', authMiddleware, ContractTemplateController.getOne);

// PATCH /api/contract-templates/:id
router.patch('/:id', authMiddleware, ContractTemplateController.update);

// DELETE /api/contract-templates/:id
router.delete('/:id', authMiddleware, ContractTemplateController.remove);

// GET /api/contract-templates/:id/logo
router.get('/:id/logo', authMiddleware, ContractTemplateController.getLogo);

// POST /api/contract-templates/:id/preview-pdf
router.post('/:id/preview-pdf', authMiddleware, ContractTemplateController.previewPdf);

// POST /api/contract-templates/:id/logo
router.post(
  '/:id/logo',
  authMiddleware,
  uploadTemplateLogo.single('logo'),
  multerErrorHandler,
  ContractTemplateController.uploadLogo
);

// DELETE /api/contract-templates/:id/logo
router.delete('/:id/logo', authMiddleware, ContractTemplateController.deleteLogo);

export default router;
