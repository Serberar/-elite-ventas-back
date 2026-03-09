import { z } from 'zod';

// Esquema para crear cliente - coincide con el frontend
export const createClientSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    lastName: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres').trim(),
    dni: z.string().min(1, 'El DNI es obligatorio').trim(),
    email: z
      .string()
      .trim()
      .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
        message: 'El formato del email no es válido (ejemplo: usuario@dominio.com)',
      })
      .optional(),
    birthday: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val)),
    phones: z
      .array(z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'))
      .min(1, 'Debe introducir al menos un número de teléfono')
      .refine((phones) => phones.length > 0, {
        message: 'Debe proporcionar al menos un teléfono válido',
      }),
    addresses: z
      .array(
        z.object({
          address: z.string().min(1, 'La dirección no puede estar vacía'),
          cupsGas: z.string().optional(),
          cupsLuz: z.string().optional(),
        })
      )
      .optional()
      .default([]),
    bankAccounts: z
      .array(
        z
          .string()
          .refine(
            (val) =>
              !val || val === '' || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{1,9}$/i.test(val),
            {
              message: 'IBAN debe tener formato válido (ej: ES1234567890123456789012)',
            }
          )
      )
      .optional()
      .default([]),
    comments: z.array(z.string()).optional().default([]),
    authorized: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val)),
    businessName: z
      .string()
      .optional()
      .or(z.literal(''))
      .transform((val) => (val === '' ? undefined : val)),
  }),
});

// Esquema para actualizar cliente
export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de cliente inválido'),
  }),
  body: z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim().optional(),
    lastName: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres').trim().optional(),
    dni: z.string().min(1, 'El DNI es obligatorio').trim().optional(),
    email: z
      .string()
      .trim()
      .refine((val) => !val || val === '' || z.string().email().safeParse(val).success, {
        message: 'El formato del email no es válido (ejemplo: usuario@dominio.com)',
      })
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
    birthday: z
      .string()
      .trim()
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => (val === '' ? null : val)),
    phones: z
      .array(
        z.string().min(9, 'El teléfono debe tener al menos 9 dígitos')
      )
      .min(1, 'Debe tener al menos un teléfono')
      .optional(),
    addresses: z
      .array(
        z.object({
          address: z.string().min(1, 'La dirección no puede estar vacía. Elimínala si no quieres añadirla.'),
          cupsGas: z.string().optional().nullable(),
          cupsLuz: z.string().optional().nullable(),
        })
      )
      .optional(),
    bankAccounts: z
      .array(
        z
          .string()
          .refine(
            (val) =>
              !val || val === '' || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{1,9}$/i.test(val),
            {
              message: 'El IBAN no tiene un formato válido (ejemplo: ES1234567890123456789012)',
            }
          )
      )
      .optional(),
    comments: z.array(z.string()).optional(),
    authorized: z
      .string()
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => (val === '' ? null : val)),
    businessName: z
      .string()
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => (val === '' ? null : val)),
  }),
});

// Esquema para obtener cliente por valor (ID, teléfono o DNI)
export const getClientByIdSchema = z.object({
  params: z.object({
    value: z.string().min(1, 'Valor de búsqueda requerido'),
  }),
});

// Esquema para agregar datos al cliente (push)
export const pushDataClientSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de cliente inválido'),
  }),
  body: z
    .object({
      phones: z.array(z.string().min(9, 'Teléfono inválido')).optional(),
      addresses: z
        .array(
          z.object({
            address: z.string().min(1, 'La dirección no puede estar vacía'),
            cupsGas: z.string().optional(),
            cupsLuz: z.string().optional(),
          })
        )
        .optional(),
      bankAccounts: z
        .array(
          z
            .string()
            .refine(
              (val) =>
                !val ||
                val === '' ||
                /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{1,9}$/i.test(val),
              {
                message: 'IBAN debe tener formato válido (ej: ES1234567890123456789012)',
              }
            )
        )
        .optional(),
      comments: z.array(z.string()).optional(),
    })
    .refine((data) => data.phones || data.addresses || data.bankAccounts || data.comments, {
      message: 'Debe proporcionar al menos uno de: phones, addresses, bankAccounts o comments',
    }),
});

// Tipos TypeScript inferidos
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type GetClientByIdInput = z.infer<typeof getClientByIdSchema>;
export type PushDataClientInput = z.infer<typeof pushDataClientSchema>;
