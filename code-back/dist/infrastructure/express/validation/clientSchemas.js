"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushDataClientSchema = exports.getClientByIdSchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
// Esquema para crear cliente - coincide con el frontend
exports.createClientSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
        lastName: zod_1.z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres').trim(),
        dni: zod_1.z.string().min(1, 'El DNI es obligatorio').trim(),
        email: zod_1.z
            .string()
            .trim()
            .refine((val) => !val || val === '' || zod_1.z.string().email().safeParse(val).success, {
            message: 'El formato del email no es válido (ejemplo: usuario@dominio.com)',
        })
            .optional(),
        birthday: zod_1.z
            .string()
            .trim()
            .optional()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? undefined : val)),
        phones: zod_1.z
            .array(zod_1.z.string().min(9, 'El teléfono debe tener al menos 9 dígitos'))
            .min(1, 'Debe introducir al menos un número de teléfono')
            .refine((phones) => phones.length > 0, {
            message: 'Debe proporcionar al menos un teléfono válido',
        }),
        addresses: zod_1.z
            .array(zod_1.z.object({
            address: zod_1.z.string().min(1, 'La dirección no puede estar vacía'),
            cupsGas: zod_1.z.string().optional(),
            cupsLuz: zod_1.z.string().optional(),
        }))
            .optional()
            .default([]),
        bankAccounts: zod_1.z
            .array(zod_1.z
            .string()
            .refine((val) => !val || val === '' || /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{1,9}$/i.test(val), {
            message: 'IBAN debe tener formato válido (ej: ES1234567890123456789012)',
        }))
            .optional()
            .default([]),
        comments: zod_1.z.array(zod_1.z.string()).optional().default([]),
        authorized: zod_1.z
            .string()
            .optional()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? undefined : val)),
        businessName: zod_1.z
            .string()
            .optional()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? undefined : val)),
    }),
});
// Esquema para actualizar cliente
exports.updateClientSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de cliente inválido'),
    }),
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim().optional(),
        lastName: zod_1.z.string().min(2, 'El apellido debe tener al menos 2 caracteres').trim().optional(),
        dni: zod_1.z.string().min(1, 'El DNI es obligatorio').trim().optional(),
        email: zod_1.z
            .string()
            .trim()
            .refine((val) => !val || val === '' || zod_1.z.string().email().safeParse(val).success, {
            message: 'El formato del email no es válido',
        })
            .optional()
            .nullable()
            .transform((val) => (val === '' ? null : val)),
        birthday: zod_1.z
            .string()
            .trim()
            .optional()
            .nullable()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? null : val)),
        phones: zod_1.z
            .array(zod_1.z.string().min(9, 'Teléfono inválido'))
            .optional(),
        addresses: zod_1.z
            .array(zod_1.z.object({
            address: zod_1.z.string().min(1, 'La dirección no puede estar vacía'),
            cupsGas: zod_1.z.string().optional().nullable(),
            cupsLuz: zod_1.z.string().optional().nullable(),
        }))
            .optional(),
        bankAccounts: zod_1.z.array(zod_1.z.string()).optional(),
        comments: zod_1.z.array(zod_1.z.string()).optional(),
        authorized: zod_1.z
            .string()
            .optional()
            .nullable()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? null : val)),
        businessName: zod_1.z
            .string()
            .optional()
            .nullable()
            .or(zod_1.z.literal(''))
            .transform((val) => (val === '' ? null : val)),
    }),
});
// Esquema para obtener cliente por valor (ID, teléfono o DNI)
exports.getClientByIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        value: zod_1.z.string().min(1, 'Valor de búsqueda requerido'),
    }),
});
// Esquema para agregar datos al cliente (push)
exports.pushDataClientSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('ID de cliente inválido'),
    }),
    body: zod_1.z
        .object({
        phones: zod_1.z.array(zod_1.z.string().min(9, 'Teléfono inválido')).optional(),
        addresses: zod_1.z
            .array(zod_1.z.object({
            address: zod_1.z.string().min(1, 'La dirección no puede estar vacía'),
            cupsGas: zod_1.z.string().optional(),
            cupsLuz: zod_1.z.string().optional(),
        }))
            .optional(),
        bankAccounts: zod_1.z
            .array(zod_1.z
            .string()
            .refine((val) => !val ||
            val === '' ||
            /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}[A-Z0-9]{1,9}$/i.test(val), {
            message: 'IBAN debe tener formato válido (ej: ES1234567890123456789012)',
        }))
            .optional(),
        comments: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .refine((data) => data.phones || data.addresses || data.bankAccounts || data.comments, {
        message: 'Debe proporcionar al menos uno de: phones, addresses, bankAccounts o comments',
    }),
});
