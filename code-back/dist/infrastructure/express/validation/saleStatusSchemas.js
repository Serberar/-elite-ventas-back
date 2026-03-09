"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderSaleStatusesSchema = exports.updateSaleStatusSchema = exports.createSaleStatusSchema = void 0;
const zod_1 = require("zod");
// ======================================
// DTOs para Use Cases (estructura plana)
// ======================================
const createSaleStatusBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre es obligatorio'),
    order: zod_1.z.number().int().nonnegative(),
    color: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? null : val)),
    isFinal: zod_1.z.boolean().optional().default(false),
    isCancelled: zod_1.z.boolean().optional().default(false),
});
const updateSaleStatusBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'El nombre es obligatorio').optional(),
    order: zod_1.z.number().int().nonnegative().optional(),
    color: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? null : val)),
    isFinal: zod_1.z.boolean().optional(),
    isCancelled: zod_1.z.boolean().optional(),
});
const reorderSaleStatusesBodySchema = zod_1.z.object({
    statuses: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        order: zod_1.z.number().int().nonnegative(),
    }))
        .min(1, 'Debe proporcionar al menos un estado'),
});
// ======================================
// SCHEMAS DE VALIDACIÓN (para middleware validateRequest)
// ======================================
// Schema para crear estado de venta
exports.createSaleStatusSchema = zod_1.z.object({
    body: createSaleStatusBodySchema,
});
// Schema para actualizar estado de venta
exports.updateSaleStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de estado inválido'),
    }),
    body: updateSaleStatusBodySchema,
});
// Schema para reordenar estados de venta
exports.reorderSaleStatusesSchema = zod_1.z.object({
    body: reorderSaleStatusesBodySchema,
});
