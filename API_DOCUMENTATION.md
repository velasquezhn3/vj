# 📚 Documentación API - Bot Villas Julie

## 🎯 Introducción

La documentación interactiva de la API del Bot Villas Julie está implementada con **Swagger/OpenAPI 3.0**, proporcionando una interfaz completa para explorar, probar y entender todos los endpoints del sistema.

## 🚀 Acceso a la Documentación

### Iniciar el servidor con documentación:
```bash
# Opción 1: Script automático
./start-with-docs.bat

# Opción 2: Manual
node adminServer.js
```

### URLs de acceso:
- **Documentación Swagger UI**: http://localhost:4000/api-docs
- **Servidor API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health

## 📋 Funcionalidades Documentadas

### 🔐 **Authentication**
- `POST /auth/login` - Login de administradores
- `POST /auth/verify` - Verificar token JWT
- `POST /auth/logout` - Cerrar sesión
- `GET /auth/me` - Perfil del usuario autenticado

### 👥 **Users**  
- `GET /admin/users` - Listar usuarios con paginación
- `POST /admin/users` - Crear nuevo usuario
- `PUT /admin/users/{id}` - Actualizar usuario

### 🏠 **Cabins**
- `GET /admin/cabins` - Listar cabañas
- `POST /admin/cabins` - Crear cabaña (con upload de imagen)
- `PUT /admin/cabins/{id}` - Actualizar cabaña
- `DELETE /admin/cabins/{id}` - Eliminar cabaña

### 📅 **Reservations**
- `GET /admin/reservations` - Listar reservas con filtros
- `POST /admin/reservations` - Crear reserva (con comprobante)
- `PUT /admin/reservations/{id}` - Actualizar reserva
- `DELETE /admin/reservations/{id}` - Eliminar reserva
- `GET /admin/reservations/upcoming` - Reservas próximas (24-72h)

### 🎯 **Activities**
- `GET /admin/activities` - Listar actividades
- `POST /admin/activities` - Crear actividad
- `PUT /admin/activities/{id}` - Actualizar actividad
- `DELETE /admin/activities/{id}` - Eliminar actividad

### 💬 **Conversation States**
- `GET /admin/conversation-states` - Estados del chatbot
- `POST /admin/conversation-states` - Crear estado
- `PUT /admin/conversation-states/{id}` - Actualizar estado
- `DELETE /admin/conversation-states/{id}` - Eliminar estado

### 📊 **Dashboard**
- `GET /admin/dashboard/stats` - Estadísticas generales
- `GET /admin/dashboard/revenue` - Ingresos por período
- `GET /admin/dashboard/occupancy` - Tasas de ocupación

### 📅 **Calendar**
- `GET /admin/calendar-occupancy` - Calendario mensual de ocupación

### 💾 **Backup**
- `GET /admin/backup/status` - Estado del sistema de backup
- `GET /admin/backup/list` - Listar backups disponibles
- `POST /admin/backup/create` - Crear backup manual
- `POST /admin/backup/restore` - Restaurar backup

### 🔧 **System**
- `GET /health` - Health check del servidor
- `POST /dev/security-test` - Testing de seguridad (desarrollo)

## 🛡️ Seguridad y Autenticación

### JWT Bearer Authentication
Todos los endpoints admin requieren autenticación JWT:

1. **Obtener token**:
   ```bash
   POST /auth/login
   Content-Type: application/json
   
   {
     "username": "admin",
     "password": "admin123"
   }
   ```

2. **Usar token en requests**:
   ```bash
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Características de seguridad implementadas:
- ✅ **Rate Limiting**: 200 requests/15min por usuario autenticado
- ✅ **Input Validation**: Validación avanzada con detección de amenazas
- ✅ **SQL Injection Protection**: Sanitización automática
- ✅ **XSS Protection**: Headers de seguridad con Helmet
- ✅ **Attack Detection**: Logging de actividades sospechosas
- ✅ **Token Revocation**: Sistema de logout con blacklist

## 📖 Cómo usar Swagger UI

### 1. **Autenticación en Swagger**:
   - Hacer clic en el botón **"Authorize"** 🔒
   - Introducir: `Bearer <your_jwt_token>`
   - Ahora puedes probar endpoints protegidos

### 2. **Probar endpoints**:
   - Expandir cualquier endpoint
   - Hacer clic en **"Try it out"**
   - Completar parámetros requeridos
   - Hacer clic en **"Execute"**

### 3. **Ver respuestas**:
   - Código de estado HTTP
   - Response body en JSON
   - Headers de respuesta
   - URL completa generada

## 🎨 Características de la Documentación

### ✨ **Interfaz Mejorada**:
- Filtros de búsqueda por tags
- Persistencia de autorización
- Tiempo de respuesta de requests
- Expansión automática de endpoints

### 📝 **Esquemas Completos**:
- Modelos de datos detallados
- Validaciones y restricciones
- Ejemplos realistas
- Tipos de contenido soportados

### 🔍 **Parámetros Documentados**:
- Query parameters con validaciones
- Path parameters tipados
- Request bodies con esquemas
- File uploads para imágenes y comprobantes

## 📊 Ejemplos de Uso

### Crear una nueva reserva:
```bash
POST /admin/reservations
Content-Type: multipart/form-data
Authorization: Bearer <token>

{
  "cabin_id": 1,
  "user_id": 5,
  "start_date": "2024-08-15",
  "end_date": "2024-08-17",
  "number_of_people": 2,
  "total_price": 300.00,
  "status": "pendiente"
}
# + archivo comprobante (opcional)
```

### Filtrar reservas por estado:
```bash
GET /admin/reservations?status=confirmado&limit=10&offset=0
Authorization: Bearer <token>
```

### Obtener calendario de ocupación:
```bash
GET /admin/calendar-occupancy?year=2024&month=8
Authorization: Bearer <token>
```

## 🛠️ Configuración Técnica

### Dependencias instaladas:
```json
{
  "swagger-jsdoc": "^6.x.x",
  "swagger-ui-express": "^5.x.x"
}
```

### Archivos de configuración:
- `config/swagger.js` - Configuración principal de OpenAPI
- `config/swaggerDocs.js` - Documentación adicional
- `adminServer.js` - Integración con Express

### Variables de entorno:
```env
NODE_ENV=development  # Para endpoints de testing
JWT_SECRET=vj_secret_key_2024_admin_dashboard_CHANGE_IN_PRODUCTION
```

## 🚀 Próximas Mejoras

### 📋 Pendientes para completar:
- [ ] Documentar rutas de dashboard específicas
- [ ] Añadir ejemplos de curl para cada endpoint
- [ ] Documentar códigos de error específicos
- [ ] Agregar diagramas de flujo de autenticación
- [ ] Testing automatizado de la documentación

### 🎯 Extensiones futuras:
- [ ] Versionado de API (v1, v2)
- [ ] Rate limiting específico por endpoint
- [ ] Webhooks para notificaciones
- [ ] Métricas de uso de API

## 🤝 Soporte

Para dudas o problemas con la documentación:
- Revisar logs del servidor en `./logs/`
- Verificar health check: http://localhost:4000/health
- Contactar al equipo de desarrollo

---

**✨ ¡La documentación está lista! Accede a http://localhost:4000/api-docs para explorar la API completa.**
