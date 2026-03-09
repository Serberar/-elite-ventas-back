import dotenv from 'dotenv';

// Cargar variables de entorno ANTES de cualquier otra importación
dotenv.config();

import { Bootstrap } from '@infrastructure/express/Bootstrap';
import logger from '@infrastructure/observability/logger/logger';
import { validateEnv } from '@infrastructure/config/envValidation';

/**
 * Punto de entrada principal de la aplicación
 */
async function main() {
  try {
    // 1. Validar variables de entorno (CRÍTICO - debe ser lo primero)
    try {
      const env = validateEnv();
      logger.info(`Variables de entorno validadas correctamente (${env.NODE_ENV})`);
    } catch (envError) {
      // Error de validación de env - usar logger.error y salir
      logger.error('Error de configuración:', envError instanceof Error ? envError.message : envError);
      process.exit(1);
    }

    // 2. Crear instancia de Bootstrap
    const bootstrap = new Bootstrap();

    // 3. Registrar manejadores de señales de terminación
    bootstrap.registerShutdownHandlers();

    // 4. Inicializar servicios (base de datos, cache, etc.)
    await bootstrap.initialize();

    // 5. Iniciar servidor HTTP
    await bootstrap.start();
  } catch (error) {
    logger.error('Error fatal al iniciar la aplicación:', error);
    process.exit(1);
  }
}

// Ejecutar aplicación
void main();
