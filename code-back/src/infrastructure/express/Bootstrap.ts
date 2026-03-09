import { Application } from 'express';
import ip from 'ip';
import logger from '@infrastructure/observability/logger/logger';
import { connectDatabase, disconnectDatabase, prisma } from '@infrastructure/prisma/prismaClient';
import { App } from '@infrastructure/express/App';
import tracing from '@infrastructure/observability/tracing/opentelemetry';

/**
 * Clase Bootstrap para inicialización ordenada del servidor
 */
export class Bootstrap {
  private app: Application;
  private server: import('http').Server | undefined;
  private port: number;
  private host: string;

  constructor() {
    this.port = process.env.PORT ? Number(process.env.PORT) : 3000;
    this.host = '0.0.0.0';

    // Crear aplicación Express
    const expressApp = new App();
    this.app = expressApp.getApp();
  }

  /**
   * Inicializa todos los servicios necesarios
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Iniciando aplicación...');

      // 1. Inicializar tracing (debe ser lo primero)
      tracing.initialize();

      // 2. Conectar a base de datos
      await this.initializeDatabase();

      // 3. Sembrar estados de sistema si no existen
      await this.ensureSystemStatuses();

      // 4. Inicializar otros servicios si es necesario
      // await this.initializeCache();
      // await this.initializeMessageQueue();

      logger.info('Todos los servicios inicializados correctamente');
    } catch (error) {
      logger.error('Error durante la inicialización:', error);
      throw error;
    }
  }

  /**
   * Inicializa la conexión a base de datos
   */
  private async initializeDatabase(): Promise<void> {
    logger.info('Conectando a base de datos...');
    await connectDatabase();
  }

  /**
   * Crea los estados de sistema si no existen (idempotente)
   */
  private async ensureSystemStatuses(): Promise<void> {
    const systemStatuses = [
      { name: 'Pendiente firma', order: 1, color: '#f59e0b', isFinal: false, isCancelled: false, isSystem: true },
      { name: 'Firmada',         order: 2, color: '#10b981', isFinal: true,  isCancelled: false, isSystem: true },
    ];

    for (const s of systemStatuses) {
      try {
        const existing = await prisma.saleStatus.findFirst({ where: { name: s.name } });
        if (!existing) {
          await prisma.saleStatus.create({ data: s });
          logger.info(`Estado de sistema creado: "${s.name}"`);
        } else if (!existing.isSystem) {
          await prisma.saleStatus.update({ where: { id: existing.id }, data: { isSystem: true } });
          logger.info(`Estado de sistema actualizado: "${s.name}"`);
        }
      } catch (error) {
        logger.warn(`No se pudo verificar estado de sistema "${s.name}": ${error instanceof Error ? error.message : error}`);
      }
    }
    logger.info('Estados de sistema verificados');
  }

  /**
   * Inicia el servidor HTTP
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          this.logStartupInfo();
          resolve();
        });

        // Manejo de errores del servidor
        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Puerto ${this.port} ya está en uso`);
          } else {
            logger.error('Error del servidor:', error);
          }
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Detiene el servidor y cierra conexiones
   */
  async stop(): Promise<void> {
    logger.info('Deteniendo servidor...');

    // Cerrar servidor HTTP
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          logger.info('Servidor HTTP cerrado');
          resolve();
        });
      });
    }

    // Shutdown de tracing
    await tracing.shutdown();

    // Desconectar base de datos
    await disconnectDatabase();

    logger.info('Aplicación detenida correctamente');
  }

  /**
   * Registra manejadores de señales de terminación
   */
  registerShutdownHandlers(): void {
    // Manejo de SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('Señal SIGINT recibida');
      void this.gracefulShutdown();
    });

    // Manejo de SIGTERM (kill)
    process.on('SIGTERM', () => {
      logger.info('Señal SIGTERM recibida');
      void this.gracefulShutdown();
    });

    // Manejo de errores no capturados
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      void this.gracefulShutdown(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      void this.gracefulShutdown(1);
    });
  }

  /**
   * Apagado graceful del servidor
   */
  private async gracefulShutdown(exitCode: number = 0): Promise<void> {
    try {
      await this.stop();
      process.exit(exitCode);
    } catch (error) {
      logger.error('Error durante el apagado:', error);
      process.exit(1);
    }
  }

  /**
   * Muestra información de inicio
   */
private logStartupInfo(): void {
  const ALLOW_ALL_CORS = process.env.ALLOW_ALL_CORS === 'true';
  const nodeEnv = process.env.NODE_ENV || 'development';

  const host = ip.address();
  const port = this.port;

  logger.info('');
  logger.info('='.repeat(60));
  logger.info('Servidor iniciado exitosamente');
  logger.info('='.repeat(60));
  logger.info(`URL Local:     http://localhost:${port}`);
  logger.info(`URL Red:       http://${host}:${port}`);
  logger.info('');
  logger.info('Endpoints disponibles:');

  // Health
  logger.info(`   • Health:        http://${host}:${port}/health`);
  logger.info(`   • Ping:          http://${host}:${port}/ping`);
  logger.info(`   • Info:          http://${host}:${port}/info`);
  logger.info(`   • Services:      http://${host}:${port}/services`);

  // Metrics
  logger.info(`   • Metrics:       http://${host}:${port}/metrics`);

  logger.info('');
  logger.info('Configuración:');
  logger.info(`   • Entorno:       ${nodeEnv}`);
  logger.info(`   • Puerto:        ${port}`);
  logger.info(`   • CORS Abierto:  ${ALLOW_ALL_CORS ? 'Sí' : 'No'}`);
  logger.info('');
  logger.info('Logs guardándose en: logs/combined.log y logs/error.log');
  logger.info('='.repeat(60));
  logger.info('');
}


  /**
   * Obtiene la aplicación Express
   */
  getApp(): Application {
    return this.app;
  }
}
