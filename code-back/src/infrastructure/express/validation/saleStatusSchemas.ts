import { z } from 'zod';

// ======================================
// DTOs para Use Cases (estructura plana)
// ======================================

const createSaleStatusBodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  order: z.number().int().nonnegative(),
  color: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  isFinal: z.boolean().optional().default(false),
  isCancelled: z.boolean().optional().default(false),
});

const updateSaleStatusBodySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').optional(),
  order: z.number().int().nonnegative().optional(),
  color: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  isFinal: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
});

const reorderSaleStatusesBodySchema = z.object({
  statuses: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int().nonnegative(),
      })
    )
    .min(1, 'Debe proporcionar al menos un estado'),
});

// ======================================
// SCHEMAS DE VALIDACIÓN (para middleware validateRequest)
// ======================================

// Schema para crear estado de venta
export const createSaleStatusSchema = z.object({
  body: createSaleStatusBodySchema,
});

// Schema para actualizar estado de venta
export const updateSaleStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de estado inválido'),
  }),
  body: updateSaleStatusBodySchema,
});

// Schema para reordenar estados de venta
export const reorderSaleStatusesSchema = z.object({
  body: reorderSaleStatusesBodySchema,
});

// ======================================
// TIPOS (DTOs planos para Use Cases)
// ======================================

export interface CreateSaleStatusDTO {
  name: string;
  order: number;
  color?: string | null;
  isFinal?: boolean;
  isCancelled?: boolean;
}

export interface UpdateSaleStatusDTO {
  id: string;
  name?: string;
  order?: number;
  color?: string | null;
  isFinal?: boolean;
  isCancelled?: boolean;
}

export type ReorderSaleStatusesDTO = z.infer<typeof reorderSaleStatusesBodySchema>;
