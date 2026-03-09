import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import ip from 'ip';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '@infrastructure/express/swagger/swaggerConfig';

// Routes
import userRoutes from '@infrastructure/routes/userRoutes';
import clientRoutes from '@infrastructure/routes/clientRoutes';
import productRoutes from '@infrastructure/routes/productRoutes';
import saleStatusRoutes from '@infrastructure/routes/saleStatusRoutes';
import saleRoutes from '@infrastructure/routes/saleRoutes';
import recordingRoutes from '@infrastructure/routes/recordingRoutes';
import allowedIpRoutes from '@infrastructure/routes/allowedIpRoutes';
import settingsRoutes from '@infrastructure/routes/settingsRoutes';
import { saleSignatureRouter, webhookRouter } from '@infrastructure/routes/signatureRoutes';
import contractConfigRoutes from '@infrastructure/routes/contractConfigRoutes';
import contractTemplateRoutes from '@infrastructure/routes/contractTemplateRoutes';

// Middleware
import logger, { morganStream } from '@infrastructure/observability/logger/logger';
import { monitoringMiddleware } from '@infrastructure/express/middleware/monitoringMiddleware';
import { errorHandler } from '@infrastructure/express/middleware/errorHandler';
import healthRoutes from '@infrastructure/routes/healthRoutes';
import {
  prometheusMiddleware,
  metricsHandler,
} from '@infrastructure/observability/metrics/prometheusMetrics';
import { serviceContainer } from '@infrastructure/container/ServiceContainer';

/**
 * Configuración de la aplicación Express
 */
export class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  /**
   * Configuración de middlewares
   */
  private configureMiddleware(): void {
    // Trust proxy
    this.app.set('trust proxy', true);

    const ALLOW_ALL_CORS = process.env.ALLOW_ALL_CORS === 'true';

    // === Helmet: Headers de seguridad HTTP ===
    this.app.use(helmet());

    // === Filtrado de IPs (controlado desde la BD, siempre registrado) ===
    this.app.use(this.ipFilterMiddleware());

    // === CORS (corregido completamente) ===
    this.app.use(this.corsMiddleware(ALLOW_ALL_CORS));

    // === Body parsing ===
    this.app.use(express.json());
    this.app.use(cookieParser());

    // === Logging HTTP ===
    this.app.use(morgan('combined', { stream: morganStream }));

    // === Métricas Prometheus ===
    this.app.use(prometheusMiddleware);

    // === Monitorización ===
    this.app.use(monitoringMiddleware);
  }

  /**
   * Middleware de filtrado por IP.
   * Totalmente controlado desde la BD (con caché de 30s).
   * EMERGENCY_IP del .env siempre se permite como fallback de seguridad.
   */
  private ipFilterMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Filtrado desactivado desde la UI → pasar todo
        const filteringEnabled = await serviceContainer.systemSettingRepository.getBool('ip_filter_enabled');
        if (!filteringEnabled) return next();

        const clientIp = this.normalizeIp(req.ip);

        logger.info(`[IP-FILTER] IP detectada: ${clientIp} | raw req.ip: ${req.ip} | X-Forwarded-For: ${req.headers['x-forwarded-for']} | path: ${req.path}`);

        // IPs privadas (red local del servidor) siempre permitidas
        if (clientIp && ip.isPrivate(clientIp)) {
          logger.info(`[IP-FILTER] PERMITIDA (red privada): ${clientIp}`);
          return next();
        }

        // IPs de la lista blanca (con caché 30s)
        const dbIps = await serviceContainer.allowedIpRepository.listIpStrings();
        if (clientIp && dbIps.includes(clientIp)) {
          logger.info(`[IP-FILTER] PERMITIDA (en lista blanca): ${clientIp}`);
          return next();
        }

        logger.warn(`[IP-FILTER] BLOQUEADA (no está en lista): ${clientIp}`);
        res.status(403).json({ message: `Tu IP (${clientIp}) no tiene acceso a esta aplicación. Contacta con el administrador.` });
      } catch (error) {
        logger.error('Error en filtrado de IP, permitiendo acceso por seguridad', { error });
        next();
      }
    };
  }

  /**
   * Middleware CORS corregido para preflight OPTIONS
   */
  private corsMiddleware(allowAll: boolean) {
    const allowedOrigins = [process.env.CORS1, process.env.CORS2, process.env.CORS3].filter(
      Boolean
    );

    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;

      // Preflight: permitir SIEMPRE
      if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
        return res.sendStatus(200);
      }

      // Validación de origen normal
      if (allowAll || !origin || allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        return next();
      }

      logger.warn(`Origen CORS no permitido: ${origin}`);
      return res.status(403).json({ message: 'CORS: Origen no permitido', origin });
    };
  }

  /**
   * Normaliza IPs IPv6 a IPv4
   */
  private normalizeIp(ip?: string): string | undefined {
    if (!ip) return;
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    if (ip === '::1') return '127.0.0.1';
    return ip;
  }

  /**
   * Configuración de rutas
   */
  private configureRoutes(): void {
    // === Favicon: silenciar petición automática del navegador ===
    this.app.get('/favicon.ico', (_req, res) => res.status(204).end());

    // === Swagger API Docs ===
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'CRM Backend API - Docs',
    }));
    this.app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

    // === API Routes ===
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/clients', clientRoutes);
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/sale-status', saleStatusRoutes);
    this.app.use('/api/sales', saleRoutes);
    this.app.use('/api/sales', recordingRoutes);
    this.app.use('/api/sales', saleSignatureRouter);
    this.app.use('/api/signature', webhookRouter);
    this.app.use('/api/allowed-ips', allowedIpRoutes);
    this.app.use('/api/settings', settingsRoutes);
    this.app.use('/api/contract-config', contractConfigRoutes);
    this.app.use('/api/contract-templates', contractTemplateRoutes);

    // === Health checks ===
    this.app.use('/', healthRoutes);

    // === Métricas Prometheus ===
    this.app.get('/metrics', metricsHandler);
    this.app.get('/api/metrics', metricsHandler);

    // === Ruta 404 ===
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada',
        path: req.path,
      });
    });
  }

  /**
   * Configuración de manejo de errores
   */
  private configureErrorHandling(): void {
    this.app.use(errorHandler); // último middleware
  }

  /**
   * Obtiene la instancia de Express
   */
  public getApp(): Application {
    return this.app;
  }
}
