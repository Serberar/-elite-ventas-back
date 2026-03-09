"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../../observability/logger/logger"));
/**
 * Middleware para validar request con esquemas Zod
 * Valida body, params, y query según el esquema proporcionado
 */
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            // Log especial para logout
            if (req.path.includes('logout')) {
                logger_1.default.debug('Logout validation starting', {
                    path: req.path,
                    method: req.method,
                    hasBody: !!req.body,
                });
            }
            // Log especial para clientes
            if (req.path.includes('clients') && req.method === 'POST') {
                logger_1.default.debug('Client creation validation starting', {
                    path: req.path,
                    method: req.method,
                    bodyKeys: Object.keys(req.body),
                });
            }
            // Validar request completo (body, params, query)
            await schema.parseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
            });
            if (req.path.includes('logout')) {
                logger_1.default.debug('Logout validation passed');
            }
            if (req.path.includes('clients') && req.method === 'POST') {
                logger_1.default.debug('Client validation passed');
            }
            logger_1.default.debug(`Validación exitosa para ${req.method} ${req.path}`);
            next();
        }
        catch (error) {
            if (req.path.includes('logout')) {
                logger_1.default.error('Logout validation failed', { error });
            }
            if (req.path.includes('clients') && req.method === 'POST') {
                logger_1.default.error('Client validation failed', { error });
                if (error instanceof zod_1.ZodError) {
                    logger_1.default.error('Zod validation errors', { issues: error.issues });
                }
            }
            if (error instanceof zod_1.ZodError) {
                // Formatear errores de Zod con nombres de campo más amigables
                const fieldNames = {
                    'body.firstName': 'Nombre',
                    'body.lastName': 'Apellidos',
                    'body.dni': 'DNI',
                    'body.email': 'Email',
                    'body.birthday': 'Fecha de nacimiento',
                    'body.phones': 'Teléfono',
                    'body.addresses': 'Direcciones',
                    'body.bankAccounts': 'Cuentas bancarias',
                    'body.comments': 'Comentarios',
                    'body.authorized': 'Persona autorizada',
                    'body.businessName': 'Razón social',
                };
                const formattedErrors = error.issues.map((err) => {
                    const fieldPath = err.path.join('.');
                    const friendlyField = fieldNames[fieldPath] || fieldPath;
                    return {
                        field: friendlyField,
                        path: fieldPath,
                        message: err.message,
                    };
                });
                logger_1.default.warn(`Validación fallida en ${req.method} ${req.path}: ${JSON.stringify(formattedErrors)}`);
                return res.status(400).json({
                    message: 'Errores de validación',
                    errors: formattedErrors,
                });
            }
            // Error inesperado
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger_1.default.error(`Error inesperado en validación: ${errorMessage}`);
            return res.status(500).json({
                message: 'Error interno del servidor',
            });
        }
    };
};
exports.validateRequest = validateRequest;
