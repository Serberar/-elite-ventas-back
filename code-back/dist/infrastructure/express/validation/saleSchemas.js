"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saleFiltersSchema = exports.changeSaleStatusSchema = exports.updateSaleItemsSchema = exports.createSaleWithProductsSchema = exports.saleItemInputSchema = exports.saleItemSchema = exports.saleClientSchema = void 0;
const zod_1 = require("zod");
/* -----------------------------------------
   SUBSCHEMA: CLIENTE PARA CREAR VENTA
----------------------------------------- */
exports.saleClientSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    dni: zod_1.z.string().min(1),
    email: zod_1.z
        .string()
        .optional()
        .nullable()
        .or(zod_1.z.literal(''))
        .transform((val) => (val === '' ? null : val)),
    birthday: zod_1.z.string().optional(),
    phones: zod_1.z.array(zod_1.z.string().min(1)),
    bankAccounts: zod_1.z.array(zod_1.z.string()).optional().default([]),
    address: zod_1.z.object({
        address: zod_1.z.string().min(1),
        cupsGas: zod_1.z.string().optional(),
        cupsLuz: zod_1.z.string().optional(),
    }),
});
/* -----------------------------------------
   SUBSCHEMA: PRODUCTO PARA CREAR VENTA
----------------------------------------- */
exports.saleItemSchema = zod_1.z.object({
    productId: zod_1.z
        .union([zod_1.z.string().uuid(), zod_1.z.literal(''), zod_1.z.null()])
        .optional()
        .transform((val) => (val === '' ? null : val)),
    name: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().min(1),
    price: zod_1.z.number().nonnegative(), // precio unitario
});
// Schema con estructura body y params para el middleware de validación (POST /:saleId/items)
exports.saleItemInputSchema = zod_1.z.object({
    params: zod_1.z.object({
        saleId: zod_1.z.string().uuid('ID de venta inválido'),
    }),
    body: exports.saleItemSchema,
});
/* -----------------------------------------
   CREATE SALE WITH PRODUCTS (Body Schema)
----------------------------------------- */
const createSaleWithProductsBodySchema = zod_1.z.object({
    client: exports.saleClientSchema, // snapshot del cliente
    items: zod_1.z.array(exports.saleItemSchema).min(1),
    statusId: zod_1.z.string().uuid().optional(),
    notes: zod_1.z.any().optional(),
    metadata: zod_1.z.any().optional(),
});
// Schema para middleware de validación
exports.createSaleWithProductsSchema = zod_1.z.object({
    body: createSaleWithProductsBodySchema,
});
/* -----------------------------------------
   UPDATE SALE ITEMS
----------------------------------------- */
const updateSaleItemBodySchema = zod_1.z.object({
    unitPrice: zod_1.z.number().nonnegative().optional(),
    quantity: zod_1.z.number().int().min(1).optional(),
    finalPrice: zod_1.z.number().nonnegative().optional(),
});
// Schema para middleware de validación
exports.updateSaleItemsSchema = zod_1.z.object({
    params: zod_1.z.object({
        saleId: zod_1.z.string().uuid('ID de venta inválido'),
        itemId: zod_1.z.string().uuid('ID de item inválido'),
    }),
    body: updateSaleItemBodySchema,
});
/* -----------------------------------------
   CHANGE STATUS
----------------------------------------- */
const changeSaleStatusBodySchema = zod_1.z.object({
    statusId: zod_1.z.string().uuid('ID de estado inválido'),
    comment: zod_1.z.string().min(1).optional(),
});
// Schema para middleware de validación
exports.changeSaleStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        saleId: zod_1.z.string().uuid('ID de venta inválido'),
    }),
    body: changeSaleStatusBodySchema,
});
/* -----------------------------------------
   LIST / FILTERS
----------------------------------------- */
const saleFiltersQuerySchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    statusId: zod_1.z.string().uuid().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
    productId: zod_1.z.string().uuid().optional(),
    minTotal: zod_1.z.coerce.number().nonnegative().optional(),
    maxTotal: zod_1.z.coerce.number().optional(),
});
// Schema para middleware de validación
exports.saleFiltersSchema = zod_1.z.object({
    query: saleFiltersQuerySchema.optional(),
});
