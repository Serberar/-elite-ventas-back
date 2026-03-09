"use strict";
/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Gestión de ventas
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Listar ventas con filtros
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statusId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por estado
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por cliente
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha desde
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha hasta
 *     responses:
 *       200:
 *         description: Lista de ventas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sale'
 *       401:
 *         description: No autorizado
 *
 *   post:
 *     summary: Crear nueva venta con productos
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSaleRequest'
 *     responses:
 *       201:
 *         description: Venta creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sale'
 *       400:
 *         description: Error de validación
 */
/**
 * @swagger
 * /sales/paginated:
 *   get:
 *     summary: Listar ventas con paginación
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Elementos por página
 *       - in: query
 *         name: statusId
 *         schema:
 *           type: string
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Lista paginada de ventas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: No autorizado
 */
/**
 * @swagger
 * /sales/stats:
 *   get:
 *     summary: Obtener estadísticas de ventas
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de ventas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSales:
 *                   type: integer
 *                 totalAmount:
 *                   type: number
 *                 byStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       statusId:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: No autorizado
 */
/**
 * @swagger
 * /sales/{saleId}:
 *   get:
 *     summary: Obtener venta por ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Venta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sale'
 *       404:
 *         description: Venta no encontrada
 */
/**
 * @swagger
 * /sales/{saleId}/status:
 *   patch:
 *     summary: Cambiar estado de la venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statusId
 *             properties:
 *               statusId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Venta no encontrada
 */
/**
 * @swagger
 * /sales/{saleId}/client:
 *   patch:
 *     summary: Actualizar datos del cliente en la venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clientSnapshot:
 *                 type: object
 *               addressSnapshot:
 *                 type: object
 *     responses:
 *       200:
 *         description: Datos del cliente actualizados
 *       404:
 *         description: Venta no encontrada
 */
/**
 * @swagger
 * /sales/{saleId}/items:
 *   post:
 *     summary: Añadir item a la venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - name
 *               - quantity
 *               - price
 *             properties:
 *               productId:
 *                 type: string
 *               name:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Item añadido
 *       404:
 *         description: Venta no encontrada
 */
/**
 * @swagger
 * /sales/{saleId}/items/{itemId}:
 *   put:
 *     summary: Actualizar item de la venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               price:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Item actualizado
 *       404:
 *         description: Venta o item no encontrado
 *
 *   delete:
 *     summary: Eliminar item de la venta
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: saleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Item eliminado
 *       404:
 *         description: Venta o item no encontrado
 */
