import { z } from 'zod';
import net from 'net';

const createAllowedIpBodySchema = z.object({
  ip: z
    .string()
    .min(1, 'La IP es obligatoria')
    .refine((val) => net.isIP(val) !== 0, 'Formato de IP inválido'),
  description: z.string().optional().nullable(),
});

export const createAllowedIpSchema = z.object({
  body: createAllowedIpBodySchema,
});

export const deleteAllowedIpSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID inválido'),
  }),
});

export interface CreateAllowedIpDTO {
  ip: string;
  description?: string | null;
}
