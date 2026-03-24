import { Response } from 'express';
import { AuthRequest } from '@infrastructure/express/middleware/authMiddleware';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

export class EmpresaController {
  static async list(req: AuthRequest, res: Response) {
    try {
      const empresas = await serviceContainer.listEmpresasUseCase.execute(req.user!);
      res.status(200).json(empresas);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al listar empresas';
      res.status(500).json({ error: msg });
    }
  }

  static async getById(req: AuthRequest, res: Response) {
    try {
      const empresa = await serviceContainer.getEmpresaUseCase.execute(req.params.id as string);
      res.status(200).json(empresa);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al obtener empresa';
      res.status(404).json({ error: msg });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const empresa = await serviceContainer.createEmpresaUseCase.execute(req.body, req.user!);
      res.status(201).json(empresa);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al crear empresa';
      res.status(400).json({ error: msg });
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const empresa = await serviceContainer.updateEmpresaUseCase.execute(
        req.params.id as string,
        req.body,
        req.user!
      );
      res.status(200).json(empresa);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al actualizar empresa';
      res.status(400).json({ error: msg });
    }
  }

  static async switchEmpresa(req: AuthRequest, res: Response) {
    try {
      const { empresaId } = req.body as { empresaId: string };
      const result = await serviceContainer.switchEmpresaUseCase.execute(req.user!, empresaId);
      res.status(200).json(result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al cambiar empresa';
      res.status(400).json({ error: msg });
    }
  }

  static async uploadLogo(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No se recibió ningún archivo' });
        return;
      }

      const empresaId = req.params.id as string;
      // La ruta pública del logo (relativa al servidor)
      const logoPath = `/uploads/logos/${req.file.filename}`;

      const empresa = await serviceContainer.updateEmpresaUseCase.execute(
        empresaId,
        { logo: logoPath },
        req.user!
      );

      res.status(200).json({ logo: empresa.logo });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Error al subir logo';
      res.status(400).json({ error: msg });
    }
  }
}
