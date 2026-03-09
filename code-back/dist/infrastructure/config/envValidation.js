"use strict";
/**
 * Validación de variables de entorno al inicio de la aplicación
 * FASE 3: Estabilidad y Resiliencia
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
exports.isProduction = isProduction;
exports.isDevelopment = isDevelopment;
const zod_1 = require("zod");
/**
 * Schema de validación para variables de entorno
 * Compatible con Zod v4
 */
const envSchema = zod_1.z.object({
    // Base de datos - OBLIGATORIO
    DATABASE_URL: zod_1.z
        .string({ message: 'DATABASE_URL es obligatorio' })
        .min(1, 'DATABASE_URL no puede estar vacío')
        .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), 'DATABASE_URL debe ser una URL de PostgreSQL válida'),
    // JWT - OBLIGATORIO
    JWT_SECRET: zod_1.z
        .string({ message: 'JWT_SECRET es obligatorio' })
        .min(32, 'JWT_SECRET debe tener al menos 32 caracteres para seguridad'),
    JWT_REFRESH_SECRET: zod_1.z
        .string({ message: 'JWT_REFRESH_SECRET es obligatorio' })
        .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres para seguridad'),
    JWT_EXPIRES_IN: zod_1.z.string().optional().default('8h'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().optional().default('7d'),
    // Servidor
    PORT: zod_1.z
        .string()
        .optional()
        .default('3000')
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().min(1).max(65535)),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).optional().default('development'),
    // CORS
    ALLOW_ALL_CORS: zod_1.z
        .string()
        .optional()
        .default('false')
        .transform((val) => val === 'true'),
    CORS1: zod_1.z.string().url().optional(),
    CORS2: zod_1.z.string().url().optional(),
    CORS3: zod_1.z.string().url().optional(),
    // Filtro IP
    FILTER_IPS: zod_1.z
        .string()
        .optional()
        .default('false')
        .transform((val) => val === 'true'),
    // Métricas
    ENABLE_METRICS: zod_1.z
        .string()
        .optional()
        .default('true')
        .transform((val) => val === 'true'),
    // Base de datos - configuración opcional
    DB_POOL_SIZE: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().min(1).max(100).optional()),
    DB_TIMEOUT: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().min(1000).optional()),
    DB_RETRIES: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().min(1).max(10).optional()),
});
/**
 * Variables de entorno validadas (se inicializa en validateEnv)
 */
let validatedEnv = null;
/**
 * Valida todas las variables de entorno al inicio
 * Lanza error si faltan variables obligatorias o tienen formato incorrecto
 */
function validateEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const errors = result.error.issues.map((issue) => {
            const path = issue.path.join('.');
            return `  - ${path}: ${issue.message}`;
        });
        const errorMessage = [
            '',
            '╔════════════════════════════════════════════════════════════╗',
            '║          ERROR DE CONFIGURACIÓN DE ENTORNO                 ║',
            '╠════════════════════════════════════════════════════════════╣',
            '║  Las siguientes variables de entorno tienen problemas:     ║',
            '╚════════════════════════════════════════════════════════════╝',
            '',
            ...errors,
            '',
            'Por favor, revisa tu archivo .env y asegúrate de que todas',
            'las variables obligatorias estén configuradas correctamente.',
            '',
        ].join('\n');
        throw new Error(errorMessage);
    }
    validatedEnv = result.data;
    return result.data;
}
/**
 * Obtiene las variables de entorno validadas
 * Debe llamarse después de validateEnv()
 */
function getEnv() {
    if (!validatedEnv) {
        throw new Error('Las variables de entorno no han sido validadas. Llama a validateEnv() primero.');
    }
    return validatedEnv;
}
/**
 * Verifica si estamos en producción
 */
function isProduction() {
    return getEnv().NODE_ENV === 'production';
}
/**
 * Verifica si estamos en desarrollo
 */
function isDevelopment() {
    return getEnv().NODE_ENV === 'development';
}
