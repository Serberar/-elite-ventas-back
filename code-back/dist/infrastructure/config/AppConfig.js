"use strict";
/**
 * Configuraciones de base de datos y aplicación
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
/**
 * Carga la configuración desde variables de entorno
 */
function loadConfig() {
    return {
        database: {
            poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
            timeout: parseInt(process.env.DB_TIMEOUT || '5000'),
            retries: parseInt(process.env.DB_RETRIES || '3'),
            maxIdleTime: parseInt(process.env.DB_MAX_IDLE_TIME || '30000'),
            connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
            queryTimeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
        },
        app: {
            name: process.env.APP_NAME || 'CRM Backend',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '3000'),
            logLevel: process.env.LOG_LEVEL || 'info',
        },
    };
}
