import { z } from 'zod';

/* -----------------------------------------
   SUBSCHEMA: CLIENTE PARA CREAR VENTA
----------------------------------------- */

export const saleClientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dni: z.string().min(1),
  email: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  birthday: z.string().optional(),
  phones: z.array(z.string().min(1)),
  bankAccounts: z.array(z.string()).optional().default([]),
  address: z.object({
    address: z.string().min(1),
    cupsGas: z.string().optional(),
    cupsLuz: z.string().optional(),
  }),
});

/* -----------------------------------------
   SUBSCHEMA: PRODUCTO PARA CREAR VENTA
----------------------------------------- */

export const saleItemSchema = z.object({
  productId: z
    .union([z.string().uuid(), z.literal(''), z.null()])
    .optional()
    .transform((val) => (val === '' ? null : val)),
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  price: z.number().nonnegative(), // precio unitario
});

// Schema con estructura body y params para el middleware de validación (POST /:saleId/items)
export const saleItemInputSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('ID de venta inválido'),
  }),
  body: saleItemSchema,
});

/* -----------------------------------------
   CREATE SALE WITH PRODUCTS (Body Schema)
----------------------------------------- */

const createSaleWithProductsBodySchema = z.object({
  client: saleClientSchema,         // snapshot del cliente
  items: z.array(saleItemSchema).min(1),
  statusId: z.string().uuid().optional(),
  notes: z.any().optional(),
  metadata: z.any().optional(),
  comercial: z.string().min(1, 'El nombre del comercial es obligatorio'),
});

// Schema para middleware de validación
export const createSaleWithProductsSchema = z.object({
  body: createSaleWithProductsBodySchema,
});

// DTO plano para UseCase
export type CreateSaleWithProductsDTO = z.infer<typeof createSaleWithProductsBodySchema>;

/* -----------------------------------------
   UPDATE SALE ITEMS
----------------------------------------- */

const updateSaleItemBodySchema = z.object({
  unitPrice: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).optional(),
  finalPrice: z.number().nonnegative().optional(),
});

// Schema para middleware de validación
export const updateSaleItemsSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('ID de venta inválido'),
    itemId: z.string().uuid('ID de item inválido'),
  }),
  body: updateSaleItemBodySchema,
});

// DTO plano para UseCase (estructura con array de items como se usa en el controlador)
export type UpdateSaleItemsDTO = {
  saleId: string;
  items: Array<{
    id: string;
    unitPrice?: number;
    quantity?: number;
    finalPrice?: number;
  }>;
};

/* -----------------------------------------
   CHANGE STATUS
----------------------------------------- */

const changeSaleStatusBodySchema = z.object({
  statusId: z.string().uuid('ID de estado inválido'),
  comment: z.string().min(1).optional(),
});

// Schema para middleware de validación
export const changeSaleStatusSchema = z.object({
  params: z.object({
    saleId: z.string().uuid('ID de venta inválido'),
  }),
  body: changeSaleStatusBodySchema,
});

// DTO plano para UseCase
export type ChangeSaleStatusDTO = z.infer<typeof changeSaleStatusBodySchema>;

/* -----------------------------------------
   LIST / FILTERS
----------------------------------------- */

const saleFiltersQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  productId: z.string().uuid().optional(),
  minTotal: z.coerce.number().nonnegative().optional(),
  maxTotal: z.coerce.number().optional(),
});

// Schema para middleware de validación
export const saleFiltersSchema = z.object({
  query: saleFiltersQuerySchema.optional(),
});

// DTO plano para UseCase
export type SaleFiltersDTO = z.infer<typeof saleFiltersQuerySchema>;

/* -----------------------------------------
   TIPOS INTERNOS (para UseCases/Dominio)
   Separados de los DTOs de validación
----------------------------------------- */

// El UseCase recibe fechas ya convertidas por el Controller
export interface SaleFiltersInternal {
  clientId?: string;
  statusId?: string;
  from?: Date;
  to?: Date;
  productId?: string;
  minTotal?: number;
  maxTotal?: number;
  comercial?: string;
}

// El UseCase de cambiar estado recibe saleId del controller
export interface ChangeSaleStatusInternal {
  saleId: string;
  statusId: string;
  comment?: string;
}
