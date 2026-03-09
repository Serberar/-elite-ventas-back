/**
 * @swagger
 * tags:
 *   name: SaleStatuses
 *   description: Gestión de estados de venta
 */

/**
 * @swagger
 * /sale-status:
 *   get:
 *     summary: Listar todos los estados de venta
 *     tags: [SaleStatuses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de estados ordenados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SaleStatus'
 *       401:
 *         description: No autorizado
 *
 *   post:
 *     summary: Crear nuevo estado de venta
 *     tags: [SaleStatuses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - order
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 example: En proceso
 *               order:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 example: '#3B82F6'
 *               isFinal:
 *                 type: boolean
 *                 default: false
 *               isCancelled:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Estado creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SaleStatus'
 *       400:
 *         description: Error de validación
 */

/**
 * @swagger
 * /sale-status/{id}:
 *   put:
 *     summary: Actualizar estado de venta
 *     tags: [SaleStatuses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               order:
 *                 type: integer
 *                 minimum: 0
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *               isFinal:
 *                 type: boolean
 *               isCancelled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Estado no encontrado
 *
 *   delete:
 *     summary: Eliminar estado de venta
 *     tags: [SaleStatuses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Estado eliminado
 *       400:
 *         description: No se puede eliminar un estado con ventas asociadas
 *       404:
 *         description: Estado no encontrado
 */

/**
 * @swagger
 * /sale-status/reorder:
 *   patch:
 *     summary: Reordenar estados de venta
 *     tags: [SaleStatuses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderedIds
 *             properties:
 *               orderedIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Lista de IDs en el nuevo orden
 *     responses:
 *       200:
 *         description: Estados reordenados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SaleStatus'
 *       400:
 *         description: Error de validación
 */
