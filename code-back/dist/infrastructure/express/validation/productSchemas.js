"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProductsSchema = exports.getProductSchema = exports.duplicateProductSchema = exports.toggleProductActiveSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
// Convierte string → number antes de validar
const numberFromString = zod_1.z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return isNaN(n) ? v : n;
    }
    return v;
}, zod_1.z.number().positive());
// ======================================
// DTOs para Use Cases (estructura plana)
// ======================================
// DTO para crear producto (usado por UseCase)
const createProductBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre es obligatorio'),
    description: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? null : val)),
    sku: zod_1.z
        .string()
        .max(50)
        .optional()
        .or(zod_1.z.literal(''))
        .transform((v) => (v === '' ? undefined : v)),
    price: numberFromString,
});
// DTO para actualizar producto (usado por UseCase)
const updateProductBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre es obligatorio').optional(),
    description: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? null : val)),
    sku: zod_1.z
        .string()
        .max(50)
        .optional()
        .or(zod_1.z.literal(''))
        .transform((v) => (v === '' ? undefined : v)),
    price: numberFromString.optional(),
});
// ======================================
// SCHEMAS DE VALIDACIÓN (para middleware validateRequest)
// ======================================
// Schema para crear producto
exports.createProductSchema = zod_1.z.object({
    body: createProductBodySchema,
});
// Schema para actualizar producto
exports.updateProductSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de producto inválido'),
    }),
    body: updateProductBodySchema,
});
exports.toggleProductActiveSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de producto inválido'),
    }),
});
exports.duplicateProductSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de producto inválido'),
    }),
});
exports.getProductSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de producto inválido'),
    }),
});
exports.listProductsSchema = zod_1.z.object({
    query: zod_1.z.object({
        active: zod_1.z
            .string()
            .optional()
            .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
        search: zod_1.z.string().min(1).optional(),
    }).optional(),
});
