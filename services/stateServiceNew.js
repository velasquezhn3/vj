/**
 * Servicio mejorado para manejo de estados con persistencia en base de datos.
 */

const { runQuery, runExecute } = require('../db');

// Cache en memoria para performance
const estadosUsuarios = {};
const ultimosSaludo = {};

/**
 * Inicializa las tablas de estado si no existen
 */
async function initStateService() {
    try {
        await runExecute(`
            CREATE TABLE IF NOT EXISTS UserStates (
                phone_number TEXT PRIMARY KEY,
                estado TEXT NOT NULL,
                datos TEXT,
                timestamp INTEGER NOT NULL
            )
        `);
        console.log('[StateService] Tablas de estado inicializadas');
    } catch (error) {
        console.error('[StateService] Error inicializando tablas:', error);
    }
}

/**
 * Establece el estado de un usuario con persistencia en BD.
 * @param {string} numero - Número del usuario.
 * @param {string} estado - Estado a establecer.
 * @param {Object} datos - Datos adicionales.
 */
async function establecerEstado(numero, estado, datos = {}) {
    const timestamp = Date.now();
    const datosJson = JSON.stringify(datos);
    
    // Actualizar cache
    estadosUsuarios[numero] = { estado, datos, timestamp };
    
    // Persistir en base de datos
    try {
        await runExecute(`
            INSERT OR REPLACE INTO UserStates (phone_number, estado, datos, timestamp)
            VALUES (?, ?, ?, ?)
        `, [numero, estado, datosJson, timestamp]);
        
        console.log(`[StateService] Estado guardado para ${numero}: ${estado}`);
    } catch (error) {
        console.error('[StateService] Error guardando estado:', error);
    }
}

/**
 * Obtiene el estado actual de un usuario desde cache o BD.
 * @param {string} numero - Número del usuario.
 * @returns {Object} Estado y datos.
 */
async function obtenerEstado(numero) {
    // Verificar cache primero
    let estado = estadosUsuarios[numero];
    
    if (!estado) {
        // Buscar en base de datos
        try {
            const rows = await runQuery('SELECT * FROM UserStates WHERE phone_number = ?', [numero]);
            if (rows && rows.length > 0) {
                const row = rows[0];
                estado = {
                    estado: row.estado,
                    datos: JSON.parse(row.datos || '{}'),
                    timestamp: row.timestamp
                };
                // Actualizar cache
                estadosUsuarios[numero] = estado;
            }
        } catch (error) {
            console.error('[StateService] Error obteniendo estado:', error);
        }
    }
    
    if (estado) {
        // Verificar expiración
        const tiempoExpiracion = estado.estado === 'ESPERANDO_PAGO' ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000; // 2 horas para ESPERANDO_PAGO, 1 hora para otros
        
        if (Date.now() - estado.timestamp > tiempoExpiracion) {
            await limpiarEstado(numero);
            return { estado: 'MENU_PRINCIPAL', datos: {} };
        }
        
        return estado;
    }
    
    return { estado: 'MENU_PRINCIPAL', datos: {} };
}

/**
 * Limpia el estado de un usuario
 */
async function limpiarEstado(numero) {
    delete estadosUsuarios[numero];
    
    try {
        await runExecute('DELETE FROM UserStates WHERE phone_number = ?', [numero]);
        console.log(`[StateService] Estado limpiado para ${numero}`);
    } catch (error) {
        console.error('[StateService] Error limpiando estado:', error);
    }
}

/**
 * Establece la fecha del último saludo enviado a un usuario.
 * @param {string} numero - Número del usuario.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 */
function establecerUltimoSaludo(numero, fecha) {
    ultimosSaludo[numero] = fecha;
}

/**
 * Obtiene la fecha del último saludo enviado a un usuario.
 * @param {string} numero - Número del usuario.
 * @returns {string|null} Fecha en formato YYYY-MM-DD o null si no existe.
 */
function obtenerUltimoSaludo(numero) {
    return ultimosSaludo[numero] || null;
}

// Versión síncrona para compatibilidad con código existente
function obtenerEstadoSync(numero) {
    const estado = estadosUsuarios[numero];
    
    if (estado) {
        const tiempoExpiracion = estado.estado === 'ESPERANDO_PAGO' ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000;
        
        if (Date.now() - estado.timestamp > tiempoExpiracion) {
            delete estadosUsuarios[numero];
            return { estado: 'MENU_PRINCIPAL', datos: {} };
        }
        
        return estado;
    }
    
    return { estado: 'MENU_PRINCIPAL', datos: {} };
}

module.exports = {
    initStateService,
    establecerEstado,
    obtenerEstado: obtenerEstadoSync, // Mantener compatibilidad
    obtenerEstadoAsync: obtenerEstado,
    limpiarEstado,
    establecerUltimoSaludo,
    obtenerUltimoSaludo
};
