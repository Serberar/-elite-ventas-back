"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUserSchema = exports.refreshTokenSchema = exports.loginUserSchema = exports.registerUserSchema = void 0;
const zod_1 = require("zod");
// Esquema para registro de usuario
exports.registerUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(2, 'El nombre debe tener al menos 2 caracteres').trim(),
        lastName: zod_1.z.string().min(2, 'El apellido debe tener al menos 2 caracteres').trim(),
        username: zod_1.z.string().min(3, 'El username debe tener al menos 3 caracteres').trim(),
        password: zod_1.z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
        role: zod_1.z.enum(['administrador', 'verificador', 'coordinador', 'comercial'], {
            message: 'Rol inválido',
        }),
    }),
});
// Esquema para login de usuario
exports.loginUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        username: zod_1.z.string().min(1, 'El username es requerido').trim(),
        password: zod_1.z.string().min(1, 'La contraseña es requerida'),
    }),
});
// Esquema para refresh token
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string().min(1, 'El refreshToken es requerido'),
    }),
});
// Esquema para logout - permitir body vacío
exports.logoutUserSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        refreshToken: zod_1.z.string().optional(),
    })
        .optional()
        .default({}),
});
