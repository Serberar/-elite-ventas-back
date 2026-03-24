import { z } from 'zod';

export const createEmpresaSchema = z.object({
  body: z.object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    slug: z
      .string()
      .min(2, 'El slug debe tener al menos 2 caracteres')
      .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones')
      .trim(),
    logo: z.string().url('URL de logo inválida').optional().nullable(),
    colorPrimario: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color primario debe ser un hex válido (#rrggbb)')
      .optional()
      .nullable(),
    colorSecundario: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color secundario debe ser un hex válido (#rrggbb)')
      .optional()
      .nullable(),
    colorNombreEmpresa: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color nombre empresa debe ser un hex válido (#rrggbb)')
      .optional()
      .nullable(),
    paginasHabilitadas: z.array(z.string()).optional(),
    paginaInicio: z.string().optional().nullable(),
  }),
});

export const updateEmpresaSchema = z.object({
  body: z.object({
    nombre: z.string().min(2).trim().optional(),
    slug: z
      .string()
      .min(2)
      .regex(/^[a-z0-9-]+$/)
      .trim()
      .optional(),
    activa: z.boolean().optional(),
    logo: z.string().url().optional().nullable(),
    colorPrimario: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
    colorSecundario: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
    colorNombreEmpresa: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .nullable(),
    paginasHabilitadas: z.array(z.string()).optional(),
    paginaInicio: z.string().optional().nullable(),
  }),
});

export const switchEmpresaSchema = z.object({
  body: z.object({
    empresaId: z.string().min(1, 'ID de empresa requerido'),
  }),
});

export type CreateEmpresaInput = z.infer<typeof createEmpresaSchema>;
export type UpdateEmpresaInput = z.infer<typeof updateEmpresaSchema>;
export type SwitchEmpresaInput = z.infer<typeof switchEmpresaSchema>;
