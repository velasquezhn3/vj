/**
 * @swagger
 * /admin/activities:
 *   get:
 *     tags: [Activities]
 *     summary: Listar actividades disponibles
 *     description: Obtiene todas las actividades y experiencias locales disponibles
 *     responses:
 *       200:
 *         description: Lista de actividades obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Activities]
 *     summary: Crear nueva actividad
 *     description: Crea una nueva actividad o experiencia local
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - duration
 *               - difficulty
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: Senderismo Cerro Julie
 *                 description: Nombre de la actividad
 *               description:
 *                 type: string
 *                 example: Caminata guiada con vista panorámica
 *                 description: Descripción detallada de la actividad
 *               duration:
 *                 type: string
 *                 example: 3 horas
 *                 description: Duración estimada de la actividad
 *               difficulty:
 *                 type: string
 *                 enum: [fácil, moderado, difícil]
 *                 example: moderado
 *                 description: Nivel de dificultad
 *               price:
 *                 type: number
 *                 format: decimal
 *                 example: 25.00
 *                 description: Precio por persona
 *               includes:
 *                 type: string
 *                 example: Guía, agua, snacks
 *                 description: Qué incluye la actividad
 *               is_available:
 *                 type: boolean
 *                 default: true
 *                 description: Si la actividad está disponible
 *     responses:
 *       200:
 *         description: Actividad creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 activityId:
 *                   type: integer
 *                   example: 123
 *                 message:
 *                   type: string
 *                   example: Actividad creada exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []

 * @swagger
 * /admin/activities/{id}:
 *   put:
 *     tags: [Activities]
 *     summary: Actualizar actividad
 *     description: Actualiza una actividad existente por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID de la actividad a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Senderismo Cerro Julie Actualizado
 *               description:
 *                 type: string
 *                 example: Nueva descripción de la actividad
 *               duration:
 *                 type: string
 *                 example: 4 horas
 *               difficulty:
 *                 type: string
 *                 enum: [fácil, moderado, difícil]
 *                 example: difícil
 *               price:
 *                 type: number
 *                 format: decimal
 *                 example: 35.00
 *               includes:
 *                 type: string
 *                 example: Guía experto, equipo completo, almuerzo
 *               is_available:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Actividad actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Actividad actualizada exitosamente
 *       400:
 *         description: ID inválido o datos de entrada incorrectos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Actividad no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     tags: [Activities]
 *     summary: Eliminar actividad
 *     description: Elimina una actividad existente por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *         description: ID de la actividad a eliminar
 *     responses:
 *       200:
 *         description: Actividad eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Actividad eliminada exitosamente
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Actividad no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []

 * @swagger
 * /admin/conversation-states:
 *   get:
 *     tags: [Conversation States]
 *     summary: Listar estados de conversación
 *     description: Obtiene todos los estados de conversación activos del chatbot
 *     responses:
 *       200:
 *         description: Estados de conversación obtenidos exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ConversationState'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 *   post:
 *     tags: [Conversation States]
 *     summary: Crear estado de conversación
 *     description: Crea un nuevo estado de conversación para el chatbot
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - state
 *               - data
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID del usuario
 *               state:
 *                 type: string
 *                 example: waiting_dates
 *                 description: Estado actual de la conversación
 *               data:
 *                 type: object
 *                 example: { cabin_id: 1, guests: 2 }
 *                 description: Datos adicionales del estado
 *     responses:
 *       200:
 *         description: Estado creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Estado creado exitosamente
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Token no válido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     security:
 *       - bearerAuth: []
 */

// Este archivo contiene solo documentación Swagger adicional
// Las rutas reales están implementadas en adminServer.js
