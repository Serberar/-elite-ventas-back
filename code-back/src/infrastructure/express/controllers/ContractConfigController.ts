import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';
import { AuthenticationError, AuthorizationError } from '@application/shared/AppError';
import {
  ContractConfig,
  ContractPageExtra,
  SeccionContrato,
  DEFAULT_CONTRACT_CONFIG,
  DEFAULT_SECCIONES,
} from '@domain/types/ContractConfig';

const SETTING_CONFIG_KEY = 'contrato_config';
const SETTING_LOGO_KEY = 'contrato_logo';

function requireAdmin(req: Request) {
  const user = req.user;
  if (!user) throw new AuthenticationError('No autorizado');
  if (user.role !== 'administrador')
    throw new AuthorizationError('Solo el administrador puede modificar la configuración del contrato');
}

function logoUrl(): string {
  return '/api/contract-config/logo';
}

/**
 * Migra configuraciones antiguas (con campos top-level como nombreEmpresa, titulo, etc.)
 * al nuevo formato donde todo está dentro de seccionesContrato.
 */
function migrateConfig(raw: Record<string, unknown>, logoPath: string | null): ContractConfig {
  const secciones = raw.seccionesContrato as SeccionContrato[] | undefined;

  // Detección del nuevo formato: tiene alguna sección de tipo identidad, firma o pie
  const isNewFormat = secciones?.some(
    (s) => s.tipo === 'identidad' || s.tipo === 'firma' || s.tipo === 'pie'
  );

  if (isNewFormat) {
    return {
      logoPath,
      logoAlign: (raw.logoAlign as ContractConfig['logoAlign']) ?? DEFAULT_CONTRACT_CONFIG.logoAlign,
      logoEnPaginasExtra: (raw.logoEnPaginasExtra as boolean) ?? false,
      seccionesContrato: secciones ?? DEFAULT_SECCIONES,
      paginasExtra: (raw.paginasExtra as ContractPageExtra[]) ?? [],
    };
  }

  // ── Migración del formato antiguo ────────────────────────────────────────
  const r = raw;
  const oldSecciones = (secciones ?? []) as Array<{
    id: string;
    tipo: string;
    titulo?: string;
    contenido?: string;
    align?: string;
  }>;

  const newSecciones: SeccionContrato[] = [];

  // 1. Identidad (siempre primera)
  newSecciones.push({
    id: 'migrated_identidad',
    tipo: 'identidad',
    nombreEmpresa: (r.nombreEmpresa as string) ?? '',
    nombreEmpresaAlign: (r.nombreEmpresaAlign as ContractConfig['logoAlign']) ?? 'center',
    tituloContrato: (r.titulo as string) ?? 'CONTRATO DE VENTA',
    tituloContratoAlign: (r.tituloAlign as ContractConfig['logoAlign']) ?? 'center',
    mostrarReferencia: (r.mostrarReferencia as boolean) ?? true,
    referenciaAlign: (r.referenciaAlign as ContractConfig['logoAlign']) ?? 'center',
    mostrarFecha: (r.mostrarFecha as boolean) ?? true,
    fechaAlign: (r.fechaAlign as ContractConfig['logoAlign']) ?? 'center',
  });

  // 2. Secciones antiguas mapeadas
  for (const s of oldSecciones) {
    if (s.tipo === 'datos_cliente') {
      newSecciones.push({ id: s.id, tipo: 'datos_cliente' });
    } else if (s.tipo === 'productos') {
      newSecciones.push({
        id: s.id,
        tipo: 'productos',
        tituloSeccionProductos: (r.tituloSeccionProductos as string) ?? 'PRODUCTOS CONTRATADOS',
        tituloSeccionProductosAlign: (r.tituloSeccionProductosAlign as ContractConfig['logoAlign']) ?? 'left',
        tablaUnicoTitulo: (r.tablaUnicoTitulo as string) ?? '',
        tablaUnicoColConcepto: (r.tablaUnicoColConcepto as string) ?? 'Concepto',
        tablaUnicoColCantidad: (r.tablaUnicoColCantidad as string) ?? 'Cant.',
        tablaUnicoColPrecioUnit: (r.tablaUnicoColPrecioUnit as string) ?? 'Precio unit.',
        tablaUnicoColTotal: (r.tablaUnicoColTotal as string) ?? 'Total',
        tablaPeriodoTitulo: (r.tablaPeriodoTitulo as string) ?? 'Servicios periódicos',
        tablaPeriodoColConcepto: (r.tablaPeriodoColConcepto as string) ?? 'Concepto',
        tablaPeriodoColPeriodicidad: (r.tablaPeriodoColPeriodicidad as string) ?? 'Periodicidad',
        tablaPeriodoColPrecio: (r.tablaPeriodoColPrecio as string) ?? 'Precio',
        tablaConsumoTitulo: (r.tablaConsumoTitulo as string) ?? 'Tarifas por consumo',
        tablaConsumoColConcepto: (r.tablaConsumoColConcepto as string) ?? 'Concepto',
        tablaConsumoColPrecioBase: (r.tablaConsumoColPrecioBase as string) ?? 'Precio base',
        tablaConsumoColPrecioConsumo: (r.tablaConsumoColPrecioConsumo as string) ?? '€/unidad',
        tablaConsumoColUnidad: (r.tablaConsumoColUnidad as string) ?? 'Unidad',
      });
    } else if (s.tipo === 'texto') {
      newSecciones.push({
        id: s.id,
        tipo: 'texto',
        titulo: s.titulo,
        contenido: s.contenido,
        align: s.align as ContractConfig['logoAlign'],
      });
    }
  }

  // Si no había datos_cliente en la config antigua, añadir uno por defecto
  if (!newSecciones.find((s) => s.tipo === 'datos_cliente')) {
    newSecciones.push({ id: 'migrated_datos', tipo: 'datos_cliente' });
  }
  // Si no había productos, añadir con defaults
  if (!newSecciones.find((s) => s.tipo === 'productos')) {
    newSecciones.push(DEFAULT_SECCIONES.find((s) => s.tipo === 'productos')!);
  }

  // 3. Firma
  newSecciones.push({
    id: 'migrated_firma',
    tipo: 'firma',
    firmaSeccionTitulo: (r.firmaSeccionTitulo as string) ?? 'FIRMA DEL CLIENTE',
    firmaSeccionTituloAlign: (r.firmaSeccionTituloAlign as ContractConfig['logoAlign']) ?? 'left',
    firmaNota: (r.firmaNota as string) ?? 'El firmante acepta las condiciones de este contrato de venta.',
    firmaNotaAlign: (r.firmaNotaAlign as ContractConfig['logoAlign']) ?? 'left',
    mostrarEmailFirma: (r.mostrarEmailFirma as boolean) ?? true,
    firmaEtiqueta: (r.firmaEtiqueta as string) ?? 'Firma del cliente',
    oculta: r.mostrarFirmaEnPaginaPrincipal === false,
  });

  // 4. Pie
  newSecciones.push({
    id: 'migrated_pie',
    tipo: 'pie',
    textoPie: (r.textoPie as string) ?? 'Documento generado electrónicamente. La firma de este contrato tiene plena validez legal.',
    textoPieAlign: (r.textoPieAlign as ContractConfig['logoAlign']) ?? 'center',
  });

  return {
    logoPath,
    logoAlign: (r.logoAlign as ContractConfig['logoAlign']) ?? 'left',
    logoEnPaginasExtra: (r.logoEnPaginasExtra as boolean) ?? false,
    seccionesContrato: newSecciones,
    paginasExtra: (r.paginasExtra as ContractPageExtra[]) ?? [],
  };
}

export class ContractConfigController {
  // GET /api/contract-config
  static async getConfig(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const repo = serviceContainer.systemSettingRepository;
      const empresaId = req.user!.empresaId;
      const [configRaw, logoPath] = await Promise.all([
        repo.get(SETTING_CONFIG_KEY, empresaId),
        repo.get(SETTING_LOGO_KEY, empresaId),
      ]);

      const logo = logoPath ?? null;

      const config: ContractConfig = configRaw
        ? migrateConfig(JSON.parse(configRaw) as Record<string, unknown>, logo)
        : { ...DEFAULT_CONTRACT_CONFIG, logoPath: logo };

      res.json({
        ...config,
        logoUrl: logo ? logoUrl() : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/contract-config
  static async saveConfig(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const body = req.body as Partial<ContractConfig>;
      const repo = serviceContainer.systemSettingRepository;
      const empresaId = req.user!.empresaId;
      const configRaw = await repo.get(SETTING_CONFIG_KEY, empresaId);
      const existing: Partial<ContractConfig> = configRaw ? JSON.parse(configRaw) : {};

      const updated: Partial<ContractConfig> = { ...existing };

      if (body.logoAlign === 'left' || body.logoAlign === 'center' || body.logoAlign === 'right') {
        updated.logoAlign = body.logoAlign;
      }
      if (typeof body.logoEnPaginasExtra === 'boolean') {
        updated.logoEnPaginasExtra = body.logoEnPaginasExtra;
      }
      if (Array.isArray(body.seccionesContrato)) {
        updated.seccionesContrato = body.seccionesContrato;
      }
      if (Array.isArray(body.paginasExtra)) {
        updated.paginasExtra = body.paginasExtra;
      }

      await repo.set(SETTING_CONFIG_KEY, JSON.stringify(updated), empresaId);

      const logoPath = await repo.get(SETTING_LOGO_KEY, empresaId);
      const logo = logoPath ?? null;
      res.json({
        ...DEFAULT_CONTRACT_CONFIG,
        ...updated,
        logoPath: logo,
        logoUrl: logo ? logoUrl() : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/contract-config/logo
  static async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      if (!req.file) {
        return res.status(400).json({ message: 'No se recibió ningún fichero' });
      }

      const relativePath = req.file.path;
      await serviceContainer.systemSettingRepository.set(SETTING_LOGO_KEY, relativePath, req.user!.empresaId);

      res.json({ logoUrl: logoUrl(), logoPath: relativePath });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/contract-config/logo
  static async deleteLogo(req: Request, res: Response, next: NextFunction) {
    try {
      requireAdmin(req);

      const repo = serviceContainer.systemSettingRepository;
      const empresaId = req.user!.empresaId;
      const logoPath = await repo.get(SETTING_LOGO_KEY, empresaId);

      if (logoPath && fs.existsSync(logoPath)) {
        fs.unlinkSync(logoPath);
      }

      await repo.set(SETTING_LOGO_KEY, '', empresaId);

      res.json({ message: 'Logo eliminado' });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/contract-config/logo
  static async getLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AuthenticationError('No autorizado');

      const repo = serviceContainer.systemSettingRepository;
      const logoPath = await repo.get(SETTING_LOGO_KEY, req.user!.empresaId);

      if (!logoPath || !fs.existsSync(logoPath)) {
        return res.status(404).json({ message: 'No hay logo configurado' });
      }

      const ext = path.extname(logoPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };
      const mime = mimeMap[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'no-cache');
      fs.createReadStream(logoPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
}
