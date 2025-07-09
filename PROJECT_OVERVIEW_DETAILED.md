# Descripción Detallada del Proyecto: Archivos, Funciones, Relaciones y Flujo de Datos

---

## 1. Raíz del Proyecto

### index.js
- **Función:** Punto de entrada principal. Carga variables de entorno y arranca el bot WhatsApp con `startBot` desde `botController.js`.
- **Relaciones:** Importa y usa `botController.js`.
- **Datos:** No maneja datos directamente, pero configura servidor Express para servir imágenes estáticas desde `public/images`.

---

## 2. Carpeta controllers/

### botController.js
- **Función:** Controla la conexión y eventos del bot WhatsApp usando la librería baileys.
- **Relaciones:** Usa `messageHandler.js` para procesar mensajes entrantes.
- **Datos:** Usa archivos de sesión en `data/session` para autenticación.

### messageHandler.js
- **Función:** Procesa mensajes recibidos, maneja estados de conversación, envía menús y delega flujos a otros controladores o rutas.
- **Relaciones:**  
  - Usa servicios: `stateService.js`, `weatherService.js`.  
  - Usa rutas: `alojamientos.js`, `postReservaHandler.js`, `shareExperience.js`.  
  - Usa controladores: `mainMenuHandler.js`, `actividadesController.js`.
- **Datos:** Consulta y actualiza estado de usuario en `stateService`.

### alojamientosController.js
- **Función:** Muestra menús y detalles de cabañas, envía imágenes al usuario.
- **Relaciones:**  
  - Usa servicio `alojamientosService.js` para cargar datos.  
  - Interactúa con `messageHandler.js` para flujo de mensajes.
- **Datos:** Lee datos de cabañas desde `data/cabañas_local.json` o `data/cabañas.json`.

### actividadesController.js
- **Función:** Controla lógica relacionada con actividades (no detallado).
- **Relaciones:** Usa `actividadesService.js`.
- **Datos:** Lee datos de actividades desde `data/actividades.json`.

### mainMenuHandler.js
- **Función:** Maneja opciones del menú principal del bot.
- **Relaciones:** Interactúa con `messageHandler.js` y otros flujos.

---

## 3. Carpeta models/

### usersModel.js
- **Función:** Define estructura y métodos para manejar datos de usuarios.
- **Relaciones:** Usado por servicios o controladores que manejan usuarios.
- **Datos:** Interactúa con base de datos SQLite (configurada en `db.js`).

---

## 4. Carpeta services/

### alojamientosService.js
- **Función:** Provee funciones para cargar y guardar datos de cabañas.
- **Relaciones:** Usado por `alojamientosController.js`.
- **Datos:** Lee/escribe en archivos JSON en `data/`.

### actividadesService.js
- **Función:** Maneja datos de actividades.
- **Relaciones:** Usado por `actividadesController.js`.
- **Datos:** Lee datos estáticos en `data/`.

### stateService.js
- **Función:** Maneja estado de conversación y datos temporales por usuario.
- **Relaciones:** Usado por `messageHandler.js` y otros controladores.
- **Datos:** Guarda estado en memoria o almacenamiento persistente.

### weatherService.js
- **Función:** Obtiene información meteorológica.
- **Relaciones:** Usado por `messageHandler.js`.
- **Datos:** Consulta APIs externas (no detallado).

---

## 5. Carpeta data/

### cabañas_local.json
- **Función:** Contiene datos estáticos de cabañas: nombre, capacidad, fotos, precios, reservas.
- **Relaciones:** Leído por `alojamientosService.js` y `alojamientosController.js`.
- **Datos:** JSON con estructura detallada de cabañas.

### crear_db.js
- **Función:** Script para crear o inicializar la base de datos SQLite.
- **Relaciones:** Usa configuración de `db.js`.
- **Datos:** Define tablas y datos iniciales.

### actividades.json, cabañas.json
- **Función:** Datos estáticos para actividades y cabañas (alternativos a `cabañas_local.json`).
- **Relaciones:** Usados por servicios y controladores correspondientes.

### session/
- **Función:** Almacena sesiones de autenticación del bot WhatsApp.
- **Relaciones:** Usado por `botController.js`.

---

## 6. Otros Archivos

### db.js
- **Función:** Configura y conecta la base de datos SQLite.
- **Relaciones:** Usado por modelos y servicios que requieren acceso a datos persistentes.

### test_db_connection.js
- **Función:** Script para probar la conexión a la base de datos.

### scripts/rename_images_with_extension.js
- **Función:** Script para renombrar archivos de imagen sin extensión agregándoles `.jpeg`.
- **Relaciones:** Utilizado para mantenimiento de archivos en `public/images/cabanas`.

---

## Flujo General de Datos y Relaciones

1. **Inicio:** `index.js` arranca el bot y servidor estático.
2. **Bot:** `botController.js` maneja conexión y eventos, recibe mensajes.
3. **Procesamiento:** `messageHandler.js` procesa mensajes, maneja estados y delega a controladores específicos.
4. **Controladores:**  
   - `alojamientosController.js` maneja datos de cabañas, usa `alojamientosService.js` para cargar datos JSON.  
   - `actividadesController.js` maneja actividades.  
   - `mainMenuHandler.js` maneja menú principal.
5. **Servicios:** Proveen acceso a datos y lógica de negocio.
6. **Modelos y DB:** `usersModel.js` y `db.js` gestionan datos persistentes.
7. **Datos estáticos:** JSON en `data/` proveen información para el bot.
8. **Sesiones:** Guardadas en `data/session` para autenticación del bot.

---

Si necesitas que detalle algún archivo o flujo en particular, o que te ayude con diagramas o documentación adicional, por favor indícalo.
