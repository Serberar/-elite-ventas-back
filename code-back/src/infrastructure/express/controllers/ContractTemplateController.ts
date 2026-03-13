import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@application/shared/AppError';
import {
  ContractTemplate,
  ContractConfig,
  ContractPageExtra,
  SeccionContrato,
  ModuloDisponible,
  PaginaContrato,
  DEFAULT_CONTRACT_CONFIG,
  DEFAULT_SECCIONES,
} from '@domain/types/ContractConfig';
import { PreviewContractData } from '@application/use-cases/signature/GenerateAndSendContractUseCase';

const SETTING_TEMPLATES_KEY = 'contrato_templates';
const SETTING_LOGO_PREFIX = 'contrato_logo_';
const SETTING_DOCX_PREFIX = 'contrato_docx_';
const SETTING_OLD_CONFIG_KEY = 'contrato_config';
const SETTING_OLD_LOGO_KEY = 'contrato_logo';

function requireAdmin(req: Request) {
  const user = req.user;
  if (!user) throw new AuthenticationError('No autorizado');
  if (user.role !== 'administrador')
    throw new AuthorizationError('Solo el administrador puede modificar las plantillas de contrato');
}

function templateLogoUrl(id: string): string {
  return `/api/contract-templates/${id}/logo`;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Lee la lista de plantillas del repositorio.
 * Si no existe `contrato_templates`, intenta migrar desde `contrato_config`.
 */
async function loadTemplates(): Promise<ContractTemplate[]> {
  const repo = serviceContainer.systemSettingRepository;
  const raw = await repo.get(SETTING_TEMPLATES_KEY);

  if (raw) {
    return JSON.parse(raw) as ContractTemplate[];
  }

  // Migración desde formato antiguo (solo si existe config previa)
  const oldConfigRaw = await repo.get(SETTING_OLD_CONFIG_KEY);
  const oldLogoPath = await repo.get(SETTING_OLD_LOGO_KEY);

  if (!oldConfigRaw && !oldLogoPath) {
    // Sistema nuevo sin config anterior: empezar con lista vacía
    await repo.set(SETTING_TEMPLATES_KEY, JSON.stringify([]));
    return [];
  }

  const oldConfig: Partial<ContractConfig> = oldConfigRaw
    ? (JSON.parse(oldConfigRaw) as Partial<ContractConfig>)
    : {};

  const secciones = (oldConfig.seccionesContrato as SeccionContrato[] | undefined) ?? DEFAULT_SECCIONES;

  const defaultTemplate: ContractTemplate = {
    id: uuid(),
    nombre: 'Contrato por defecto',
    esDefecto: true,
    logoPath: oldLogoPath || null,
    logoAlign: oldConfig.logoAlign ?? DEFAULT_CONTRACT_CONFIG.logoAlign,
    logoEnPaginasExtra: oldConfig.logoEnPaginasExtra ?? false,
    seccionesContrato: secciones,
    paginasExtra: (oldConfig.paginasExtra as ContractPageExtra[] | undefined) ?? [],
  };

  // Guardar el logo con la nueva clave si existe
  if (oldLogoPath) {
    await repo.set(`${SETTING_LOGO_PREFIX}${defaultTemplate.id}`, oldLogoPath);
  }

  const templates = [defaultTemplate];
  await repo.set(SETTING_TEMPLATES_KEY, JSON.stringify(templates));
  return templates;
}

async function saveTemplates(templates: ContractTemplate[]): Promise<void> {
  await serviceContainer.systemSettingRepository.set(
    SETTING_TEMPLATES_KEY,
    JSON.stringify(templates)
  );
}

export class ContractTemplateController {
  // GET /api/contract-templates
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const templates = await loadTemplates();
      const repo = serviceContainer.systemSettingRepository;

      const withUrls = await Promise.all(
        templates.map(async (t) => {
          const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${t.id}`);
          const docxPath = await repo.get(`${SETTING_DOCX_PREFIX}${t.id}`);
          return {
            ...t,
            logoPath: logoPath || null,
            logoUrl: logoPath ? templateLogoUrl(t.id) : null,
            docxPath: undefined,
            tieneDocx: !!(docxPath),
          };
        })
      );

      res.json(withUrls);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/contract-templates
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const body = req.body as Partial<ContractTemplate>;
      const templates = await loadTemplates();

      const newTemplate: ContractTemplate = {
        id: uuid(),
        nombre: body.nombre ?? 'Nueva plantilla',
        esDefecto: templates.length === 0,
        logoPath: null,
        logoAlign: body.logoAlign ?? 'left',
        logoEnPaginasExtra: body.logoEnPaginasExtra ?? false,
        modulos: (body.modulos as ModuloDisponible[] | undefined) ?? undefined,
        paginas: (body.paginas as PaginaContrato[] | undefined) ?? undefined,
        seccionesContrato: (body.seccionesContrato as SeccionContrato[]) ?? [],
        paginasExtra: (body.paginasExtra as ContractPageExtra[]) ?? [],
      };

      templates.push(newTemplate);
      await saveTemplates(templates);

      res.status(201).json({ ...newTemplate, logoUrl: null, tieneDocx: false });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/contract-templates/:id
  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
      const templates = await loadTemplates();
      const template = templates.find((t) => t.id === id);
      if (!template) throw new NotFoundError('Plantilla', id);

      const repo = serviceContainer.systemSettingRepository;
      const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${id}`);
      const docxPath = await repo.get(`${SETTING_DOCX_PREFIX}${id}`);

      res.json({
        ...template,
        logoPath: logoPath || null,
        logoUrl: logoPath ? templateLogoUrl(id) : null,
        docxPath: undefined,
        tieneDocx: !!(docxPath),
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/contract-templates/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const templates = await loadTemplates();
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new NotFoundError('Plantilla', id);

      const body = req.body as Partial<ContractTemplate>;
      const existing = templates[idx];

      const updated: ContractTemplate = {
        ...existing,
        nombre: body.nombre ?? existing.nombre,
        logoAlign: body.logoAlign ?? existing.logoAlign,
        logoEnPaginasExtra: body.logoEnPaginasExtra ?? existing.logoEnPaginasExtra,
      };

      if (Array.isArray(body.modulos)) {
        updated.modulos = body.modulos;
      }
      if (Array.isArray(body.paginas)) {
        updated.paginas = body.paginas;
      }
      if (Array.isArray(body.seccionesContrato)) {
        updated.seccionesContrato = body.seccionesContrato;
      }
      if (Array.isArray(body.paginasExtra)) {
        updated.paginasExtra = body.paginasExtra;
      }

      // Si se marca como defecto, quitar esDefecto a los demás
      if (body.esDefecto === true) {
        templates.forEach((t) => { t.esDefecto = false; });
        updated.esDefecto = true;
      }

      templates[idx] = updated;
      await saveTemplates(templates);

      const repoForUpdate = serviceContainer.systemSettingRepository;
      const logoPath = await repoForUpdate.get(`${SETTING_LOGO_PREFIX}${id}`);
      const docxPathForUpdate = await repoForUpdate.get(`${SETTING_DOCX_PREFIX}${id}`);

      res.json({
        ...updated,
        logoPath: logoPath || null,
        logoUrl: logoPath ? templateLogoUrl(id) : null,
        docxPath: undefined,
        tieneDocx: !!(docxPathForUpdate),
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/contract-templates/:id
  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const templates = await loadTemplates();
      const idx = templates.findIndex((t) => t.id === id);
      if (idx === -1) throw new NotFoundError('Plantilla', id);

      const wasDefault = templates[idx].esDefecto;
      templates.splice(idx, 1);

      if (wasDefault && templates.length > 0) {
        templates[0].esDefecto = true;
      }

      // Eliminar logo y docx de disco y settings
      const repo = serviceContainer.systemSettingRepository;
      const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${id}`);
      if (logoPath && fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      await repo.set(`${SETTING_LOGO_PREFIX}${id}`, '');

      const docxPathToDelete = await repo.get(`${SETTING_DOCX_PREFIX}${id}`);
      if (docxPathToDelete && fs.existsSync(docxPathToDelete)) {
        fs.unlinkSync(docxPathToDelete);
      }
      await repo.set(`${SETTING_DOCX_PREFIX}${id}`, '');

      await saveTemplates(templates);
      res.json({ message: 'Plantilla eliminada' });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/contract-templates/:id/logo
  static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const templates = await loadTemplates();
      if (!templates.find((t) => t.id === id)) throw new NotFoundError('Plantilla', id);

      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún fichero' });
      }

      const relativePath = req.file.path;
      await serviceContainer.systemSettingRepository.set(
        `${SETTING_LOGO_PREFIX}${id}`,
        relativePath
      );

      res.json({ logoUrl: templateLogoUrl(id), logoPath: relativePath });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/contract-templates/:id/logo
  static async deleteLogo(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const repo = serviceContainer.systemSettingRepository;
      const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${id}`);

      if (logoPath && fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }
      await repo.set(`${SETTING_LOGO_PREFIX}${id}`, '');

      res.json({ message: 'Logo eliminado' });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/contract-templates/:id/logo
  static async getLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
      const repo = serviceContainer.systemSettingRepository;
      const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${id}`);

      if (!logoPath || !fs.existsSync(logoPath)) {
        return res.status(404).json({ message: 'No hay logo configurado para esta plantilla' });
      }

      const ext = path.extname(logoPath).toLowerCase();
      res.setHeader('Content-Type', getMimeType(ext));
      res.setHeader('Cache-Control', 'no-cache');
      fs.createReadStream(logoPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/contract-templates/:id/docx
  static async uploadDocx(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const templates = await loadTemplates();
      if (!templates.find((t) => t.id === id)) throw new NotFoundError('Plantilla', id);

      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún fichero .docx' });
      }

      await serviceContainer.systemSettingRepository.set(
        `${SETTING_DOCX_PREFIX}${id}`,
        req.file.path
      );

      res.json({ tieneDocx: true });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/contract-templates/:id/docx
  static async deleteDocx(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const repo = serviceContainer.systemSettingRepository;
      const docxPath = await repo.get(`${SETTING_DOCX_PREFIX}${id}`);

      if (docxPath && fs.existsSync(docxPath)) {
        fs.unlinkSync(docxPath);
      }
      await repo.set(`${SETTING_DOCX_PREFIX}${id}`, '');

      res.json({ message: 'Plantilla Word eliminada', tieneDocx: false });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/contract-templates/:id/docx
  static async downloadDocx(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const { id } = req.params as Record<string, string>;
      const repo = serviceContainer.systemSettingRepository;
      const docxPath = await repo.get(`${SETTING_DOCX_PREFIX}${id}`);

      if (!docxPath || !fs.existsSync(docxPath)) {
        return res.status(404).json({ message: 'No hay plantilla Word para esta plantilla' });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="template-${id}.docx"`);
      fs.createReadStream(docxPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/contract-templates/:id/preview-pdf
  static async previewPdf(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const { id } = req.params as Record<string, string>;
      const { client, items, comercial } = req.body as PreviewContractData;

      const pdfBuffer = await serviceContainer.generateAndSendContractUseCase.generatePreviewPdf(
        id || undefined,
        { client, items, comercial }
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="contrato-preview.pdf"');
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Carga una plantilla por ID para generación de PDF.
   * Si templateId no se especifica o no existe, devuelve la plantilla por defecto.
   * Incluye docxPath interno (no se expone al cliente, solo para generación interna).
   */
  static async loadForPdf(templateId?: string): Promise<ContractConfig & { docxPath: string | null }> {
    const templates = await loadTemplates();
    const repo = serviceContainer.systemSettingRepository;

    let template: ContractTemplate | undefined;
    if (templateId) {
      template = templates.find((t) => t.id === templateId);
    }
    if (!template) {
      template = templates.find((t) => t.esDefecto) ?? templates[0];
    }

    if (!template) {
      return { ...DEFAULT_CONTRACT_CONFIG, docxPath: null };
    }

    const logoPath = await repo.get(`${SETTING_LOGO_PREFIX}${template.id}`);
    const docxPath = await repo.get(`${SETTING_DOCX_PREFIX}${template.id}`);
    return {
      ...template,
      logoPath: logoPath || null,
      docxPath: docxPath || null,
    };
  }
}
