import { z } from 'zod';

// Esquema para registro de usuario
export const registerUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
    lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').trim(),
    username: z.string().min(3, 'El username debe tener al menos 3 caracteres').trim(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    role: z.enum(['administrador', 'verificador', 'coordinador', 'comercial'], {
      message: 'Rol inválido',
    }),
  }),
});

// Esquema para login de usuario
export const loginUserSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'El username es requerido').trim(),
    password: z.string().min(1, 'La contraseña es requerida'),
  }),
});

// Esquema para refresh token
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'El refreshToken es requerido'),
  }),
});

// Esquema para logout - permitir body vacío
export const logoutUserSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional()
    .default({}),
});

// Debug logging (commented out for production)
// console.log('[SCHEMA DEBUG] logoutUserSchema created:', logoutUserSchema);

// Tipos TypeScript inferidos
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutUserInput = z.infer<typeof logoutUserSchema>;
