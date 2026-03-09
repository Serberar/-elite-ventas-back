"use strict";
/**
 * @file appConfig.spec.ts
 * Tests para AppConfig - Sistema de configuración de la aplicación
 * Cubre carga de variables de entorno, valores por defecto, validación de tipos
 */
Object.defineProperty(exports, "__esModule", { value: true });
const AppConfig_1 = require("../../infrastructure/config/AppConfig");
describe('AppConfig', () => {
    // Guardar variables de entorno originales
    const originalEnv = process.env;
    beforeEach(() => {
        // Resetear process.env antes de cada test
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        // Restaurar variables de entorno originales
        process.env = originalEnv;
    });
    describe('loadConfig function', () => {
        it('should load configuration with default values when no env vars are set', () => {
            // Limpiar variables de entorno relacionadas
            delete process.env.DB_POOL_SIZE;
            delete process.env.DB_TIMEOUT;
            delete process.env.DB_RETRIES;
            delete process.env.DB_MAX_IDLE_TIME;
            delete process.env.DB_CONNECTION_TIMEOUT;
            delete process.env.DB_QUERY_TIMEOUT;
            delete process.env.APP_NAME;
            delete process.env.APP_VERSION;
            delete process.env.NODE_ENV;
            delete process.env.PORT;
            delete process.env.LOG_LEVEL;
            const config = (0, AppConfig_1.loadConfig)();
            // Type assertion to ensure config matches AppConfig interface
            expect(config).toEqual({
                database: {
                    poolSize: 10,
                    timeout: 5000,
                    retries: 3,
                    maxIdleTime: 30000,
                    connectionTimeout: 10000,
                    queryTimeout: 30000,
                },
                app: {
                    name: 'CRM Backend',
                    version: '1.0.0',
                    environment: 'development',
                    port: 3000,
                    logLevel: 'info',
                },
            });
        });
        it('should load configuration from environment variables', () => {
            // Configurar variables de entorno
            process.env.DB_POOL_SIZE = '20';
            process.env.DB_TIMEOUT = '8000';
            process.env.DB_RETRIES = '5';
            process.env.DB_MAX_IDLE_TIME = '60000';
            process.env.DB_CONNECTION_TIMEOUT = '15000';
            process.env.DB_QUERY_TIMEOUT = '45000';
            process.env.APP_NAME = 'Custom CRM';
            process.env.APP_VERSION = '2.1.0';
            process.env.NODE_ENV = 'production';
            process.env.PORT = '4000';
            process.env.LOG_LEVEL = 'debug';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config).toEqual({
                database: {
                    poolSize: 20,
                    timeout: 8000,
                    retries: 5,
                    maxIdleTime: 60000,
                    connectionTimeout: 15000,
                    queryTimeout: 45000,
                },
                app: {
                    name: 'Custom CRM',
                    version: '2.1.0',
                    environment: 'production',
                    port: 4000,
                    logLevel: 'debug',
                },
            });
        });
        it('should handle partial environment variables with defaults', () => {
            // Solo configurar algunas variables
            process.env.DB_POOL_SIZE = '15';
            process.env.APP_NAME = 'Partial CRM';
            process.env.NODE_ENV = 'staging';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.poolSize).toBe(15);
            expect(config.database.timeout).toBe(5000); // default
            expect(config.app.name).toBe('Partial CRM');
            expect(config.app.environment).toBe('staging');
            expect(config.app.port).toBe(3000); // default
        });
    });
    describe('Database Configuration', () => {
        it('should parse database pool size correctly', () => {
            process.env.DB_POOL_SIZE = '25';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.poolSize).toBe(25);
            expect(typeof config.database.poolSize).toBe('number');
        });
        it('should parse database timeout correctly', () => {
            process.env.DB_TIMEOUT = '12000';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.timeout).toBe(12000);
            expect(typeof config.database.timeout).toBe('number');
        });
        it('should parse database retries correctly', () => {
            process.env.DB_RETRIES = '7';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.retries).toBe(7);
            expect(typeof config.database.retries).toBe('number');
        });
        it('should parse database max idle time correctly', () => {
            process.env.DB_MAX_IDLE_TIME = '90000';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.maxIdleTime).toBe(90000);
            expect(typeof config.database.maxIdleTime).toBe('number');
        });
        it('should parse database connection timeout correctly', () => {
            process.env.DB_CONNECTION_TIMEOUT = '20000';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.connectionTimeout).toBe(20000);
            expect(typeof config.database.connectionTimeout).toBe('number');
        });
        it('should parse database query timeout correctly', () => {
            process.env.DB_QUERY_TIMEOUT = '60000';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.queryTimeout).toBe(60000);
            expect(typeof config.database.queryTimeout).toBe('number');
        });
        it('should handle invalid database numeric values gracefully', () => {
            process.env.DB_POOL_SIZE = 'invalid';
            process.env.DB_TIMEOUT = 'not-a-number';
            const config = (0, AppConfig_1.loadConfig)();
            // parseInt() convierte strings inválidos a NaN
            expect(isNaN(config.database.poolSize)).toBe(true);
            expect(isNaN(config.database.timeout)).toBe(true);
        });
    });
    describe('App Configuration', () => {
        it('should handle app name from environment', () => {
            process.env.APP_NAME = 'Enterprise CRM System';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.app.name).toBe('Enterprise CRM System');
            expect(typeof config.app.name).toBe('string');
        });
        it('should handle app version from environment', () => {
            process.env.APP_VERSION = '3.2.1';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.app.version).toBe('3.2.1');
            expect(typeof config.app.version).toBe('string');
        });
        it('should handle different environments', () => {
            const environments = ['development', 'staging', 'production', 'test'];
            environments.forEach((env) => {
                process.env.NODE_ENV = env;
                const config = (0, AppConfig_1.loadConfig)();
                expect(config.app.environment).toBe(env);
            });
        });
        it('should parse app port correctly', () => {
            process.env.PORT = '8080';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.app.port).toBe(8080);
            expect(typeof config.app.port).toBe('number');
        });
        it('should handle different log levels', () => {
            const logLevels = ['error', 'warn', 'info', 'debug', 'trace'];
            logLevels.forEach((level) => {
                process.env.LOG_LEVEL = level;
                const config = (0, AppConfig_1.loadConfig)();
                expect(config.app.logLevel).toBe(level);
            });
        });
        it('should handle invalid port gracefully', () => {
            process.env.PORT = 'invalid-port';
            const config = (0, AppConfig_1.loadConfig)();
            expect(isNaN(config.app.port)).toBe(true);
        });
    });
    describe('Configuration Structure', () => {
        it('should return config with correct structure', () => {
            const config = (0, AppConfig_1.loadConfig)();
            expect(config).toHaveProperty('database');
            expect(config).toHaveProperty('app');
            // Database properties
            expect(config.database).toHaveProperty('poolSize');
            expect(config.database).toHaveProperty('timeout');
            expect(config.database).toHaveProperty('retries');
            expect(config.database).toHaveProperty('maxIdleTime');
            expect(config.database).toHaveProperty('connectionTimeout');
            expect(config.database).toHaveProperty('queryTimeout');
            // App properties
            expect(config.app).toHaveProperty('name');
            expect(config.app).toHaveProperty('version');
            expect(config.app).toHaveProperty('environment');
            expect(config.app).toHaveProperty('port');
            expect(config.app).toHaveProperty('logLevel');
        });
        it('should have correct data types', () => {
            const config = (0, AppConfig_1.loadConfig)();
            // Database types
            expect(typeof config.database.poolSize).toBe('number');
            expect(typeof config.database.timeout).toBe('number');
            expect(typeof config.database.retries).toBe('number');
            expect(typeof config.database.maxIdleTime).toBe('number');
            expect(typeof config.database.connectionTimeout).toBe('number');
            expect(typeof config.database.queryTimeout).toBe('number');
            // App types
            expect(typeof config.app.name).toBe('string');
            expect(typeof config.app.version).toBe('string');
            expect(typeof config.app.environment).toBe('string');
            expect(typeof config.app.port).toBe('number');
            expect(typeof config.app.logLevel).toBe('string');
        });
    });
    describe('Configuration Edge Cases', () => {
        it('should handle empty string environment variables', () => {
            process.env.APP_NAME = '';
            process.env.DB_POOL_SIZE = '';
            const config = (0, AppConfig_1.loadConfig)();
            // String vacío es falsy, por lo que usa el default en ambos casos
            expect(config.app.name).toBe('CRM Backend'); // Usa valor por defecto
            expect(config.database.poolSize).toBe(10); // Usa valor por defecto (parseInt('10'))
        });
        it('should handle zero values correctly', () => {
            process.env.DB_POOL_SIZE = '0';
            process.env.PORT = '0';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.poolSize).toBe(0);
            expect(config.app.port).toBe(0);
        });
        it('should handle negative values correctly', () => {
            process.env.DB_POOL_SIZE = '-5';
            process.env.PORT = '-8080';
            const config = (0, AppConfig_1.loadConfig)();
            expect(config.database.poolSize).toBe(-5);
            expect(config.app.port).toBe(-8080);
        });
        it('should create new config object on each call', () => {
            const config1 = (0, AppConfig_1.loadConfig)();
            const config2 = (0, AppConfig_1.loadConfig)();
            expect(config1).not.toBe(config2); // Different object references
            expect(config1).toEqual(config2); // But same content
        });
    });
});
