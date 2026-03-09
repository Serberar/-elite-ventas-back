"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Cargar variables de entorno ANTES de cualquier otra importación
dotenv_1.default.config();
const Bootstrap_1 = require("./infrastructure/express/Bootstrap");
const logger_1 = __importDefault(require("./infrastructure/observability/logger/logger"));
const envValidation_1 = require("./infrastructure/config/envValidation");
/**
 * Punto de entrada principal de la aplicación
 */
async function main() {
    try {
        // 1. Validar variables de entorno (CRÍTICO - debe ser lo primero)
        try {
            const env = (0, envValidation_1.validateEnv)();
            logger_1.default.info(`Variables de entorno validadas correctamente (${env.NODE_ENV})`);
        }
        catch (envError) {
            // Error de validación de env - mostrar mensaje y salir
            console.error(envError instanceof Error ? envError.message : envError);
            process.exit(1);
        }
        // 2. Crear instancia de Bootstrap
        const bootstrap = new Bootstrap_1.Bootstrap();
        // 3. Registrar manejadores de señales de terminación
        bootstrap.registerShutdownHandlers();
        // 4. Inicializar servicios (base de datos, cache, etc.)
        await bootstrap.initialize();
        // 5. Iniciar servidor HTTP
        await bootstrap.start();
    }
    catch (error) {
        logger_1.default.error('Error fatal al iniciar la aplicación:', error);
        process.exit(1);
    }
}
// Ejecutar aplicación
void main();
