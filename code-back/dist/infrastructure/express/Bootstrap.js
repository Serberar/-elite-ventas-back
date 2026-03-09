"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bootstrap = void 0;
const ip_1 = __importDefault(require("ip"));
const logger_1 = __importDefault(require("../observability/logger/logger"));
const prismaClient_1 = require("../prisma/prismaClient");
const App_1 = require("../express/App");
const opentelemetry_1 = __importDefault(require("../observability/tracing/opentelemetry"));
/**
 * Clase Bootstrap para inicialización ordenada del servidor
 */
class Bootstrap {
    app;
    server;
    port;
    host;
    constructor() {
        this.port = process.env.PORT ? Number(process.env.PORT) : 3000;
        this.host = '0.0.0.0';
        // Crear aplicación Express
        const expressApp = new App_1.App();
        this.app = expressApp.getApp();
    }
    /**
     * Inicializa todos los servicios necesarios
     */
    async initialize() {
        try {
            logger_1.default.info('Iniciando aplicación...');
            // 1. Inicializar tracing (debe ser lo primero)
            opentelemetry_1.default.initialize();
            // 2. Conectar a base de datos
            await this.initializeDatabase();
            // 3. Inicializar otros servicios si es necesario
            // await this.initializeCache();
            // await this.initializeMessageQueue();
            logger_1.default.info('Todos los servicios inicializados correctamente');
        }
        catch (error) {
            logger_1.default.error('Error durante la inicialización:', error);
            throw error;
        }
    }
    /**
     * Inicializa la conexión a base de datos
     */
    async initializeDatabase() {
        logger_1.default.info('Conectando a base de datos...');
        await (0, prismaClient_1.connectDatabase)();
    }
    /**
     * Inicia el servidor HTTP
     */
    async start() {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, this.host, () => {
                    this.logStartupInfo();
                    resolve();
                });
                // Manejo de errores del servidor
                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger_1.default.error(`Puerto ${this.port} ya está en uso`);
                    }
                    else {
                        logger_1.default.error('Error del servidor:', error);
                    }
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Detiene el servidor y cierra conexiones
     */
    async stop() {
        logger_1.default.info('Deteniendo servidor...');
        // Cerrar servidor HTTP
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(() => {
                    logger_1.default.info('Servidor HTTP cerrado');
                    resolve();
                });
            });
        }
        // Shutdown de tracing
        await opentelemetry_1.default.shutdown();
        // Desconectar base de datos
        await (0, prismaClient_1.disconnectDatabase)();
        logger_1.default.info('Aplicación detenida correctamente');
    }
    /**
     * Registra manejadores de señales de terminación
     */
    registerShutdownHandlers() {
        // Manejo de SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger_1.default.info('Señal SIGINT recibida');
            void this.gracefulShutdown();
        });
        // Manejo de SIGTERM (kill)
        process.on('SIGTERM', () => {
            logger_1.default.info('Señal SIGTERM recibida');
            void this.gracefulShutdown();
        });
        // Manejo de errores no capturados
        process.on('uncaughtException', (error) => {
            logger_1.default.error('Uncaught Exception:', error);
            void this.gracefulShutdown(1);
        });
        process.on('unhandledRejection', (reason) => {
            logger_1.default.error('Unhandled Rejection:', reason);
            void this.gracefulShutdown(1);
        });
    }
    /**
     * Apagado graceful del servidor
     */
    async gracefulShutdown(exitCode = 0) {
        try {
            await this.stop();
            process.exit(exitCode);
        }
        catch (error) {
            logger_1.default.error('Error durante el apagado:', error);
            process.exit(1);
        }
    }
    /**
     * Muestra información de inicio
     */
    logStartupInfo() {
        const FILTER_IPS = process.env.FILTER_IPS === 'true';
        const ALLOW_ALL_CORS = process.env.ALLOW_ALL_CORS === 'true';
        const nodeEnv = process.env.NODE_ENV || 'development';
        const host = ip_1.default.address();
        const port = this.port;
        logger_1.default.info('');
        logger_1.default.info('='.repeat(60));
        logger_1.default.info('Servidor iniciado exitosamente');
        logger_1.default.info('='.repeat(60));
        logger_1.default.info(`URL Local:     http://localhost:${port}`);
        logger_1.default.info(`URL Red:       http://${host}:${port}`);
        logger_1.default.info('');
        logger_1.default.info('Endpoints disponibles:');
        // Health
        logger_1.default.info(`   • Health:        http://${host}:${port}/health`);
        logger_1.default.info(`   • Ping:          http://${host}:${port}/ping`);
        logger_1.default.info(`   • Info:          http://${host}:${port}/info`);
        logger_1.default.info(`   • Services:      http://${host}:${port}/services`);
        // Metrics
        logger_1.default.info(`   • Metrics:       http://${host}:${port}/metrics`);
        logger_1.default.info('');
        logger_1.default.info('Configuración:');
        logger_1.default.info(`   • Entorno:       ${nodeEnv}`);
        logger_1.default.info(`   • Puerto:        ${port}`);
        logger_1.default.info(`   • Filtro IP:     ${FILTER_IPS ? 'Sí' : 'No'}`);
        logger_1.default.info(`   • CORS Abierto:  ${ALLOW_ALL_CORS ? 'Sí' : 'No'}`);
        logger_1.default.info('');
        logger_1.default.info('Logs guardándose en: logs/combined.log y logs/error.log');
        logger_1.default.info('='.repeat(60));
        logger_1.default.info('');
    }
    /**
     * Obtiene la aplicación Express
     */
    getApp() {
        return this.app;
    }
}
exports.Bootstrap = Bootstrap;
