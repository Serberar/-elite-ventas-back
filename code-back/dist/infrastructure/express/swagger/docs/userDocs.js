"use strict";
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Autenticación y gestión de usuarios
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Registrar nuevo usuario
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - username
 *               - password
 *               - role
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [administrador, comercial, gestor]
 *     responses:
 *       201:
 *         description: Usuario creado
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * @swagger
 * /users/refresh:
 *   post:
 *     summary: Refrescar token de acceso
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Solo si USE_COOKIE_AUTH=false
 *     responses:
 *       200:
 *         description: Token actualizado
 *       401:
 *         description: Token inválido
 */
/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Solo si USE_COOKIE_AUTH=false
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
/**
 * @swagger
 * /users/csrf-token:
 *   get:
 *     summary: Obtener token CSRF
 *     description: Solo necesario si USE_COOKIE_AUTH=true
 *     tags: [Users]
 *     security: []
 *     responses:
 *       200:
 *         description: Token CSRF
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
