const fs = require('fs').promises;
const path = require('path');
const { addKeyword } = require('@bot-whatsapp/bot');

const ACTIVIDADES_PATH = path.join(__dirname, 'actividades.json');

// Cache para actividades
let actividadesCache = null;
let lastFetch = 0;
const CACHE_DURATION = 300000; // 5 minutos en ms

async function loadActividades() {
  // Usar cache si está vigente
  if (actividadesCache && Date.now() - lastFetch < CACHE_DURATION) {
    return actividadesCache;
  }
  
  try {
    const data = await fs.readFile(ACTIVIDADES_PATH, 'utf8');
    actividadesCache = JSON.parse(data);
    lastFetch = Date.now();
    return actividadesCache;
  } catch (e) {
    console.error('Error cargando actividades:', e);
    return [];
  }
}

// Formateador seguro para valores
const safeValue = (value, defaultValue = 'N/A') => {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (Array.isArray(value) return value.length > 0 ? value.join(', ') : defaultValue;
  return value;
};

// Generador de detalles de actividad
function formatActivityDetails(actividad) {
  const sections = [];
  
  // Cabecera
  sections.push(`📌 *${safeValue(actividad.nombre)}*`);
  if (actividad.categoria || actividad.subcategoria) {
    sections.push(`(${safeValue(actividad.categoria)} - ${safeValue(actividad.subcategoria)})\n`);
  }
  
  // Descripción
  sections.push(`📝 *Descripción:*\n${safeValue(actividad.descripcion)}\n`);
  
  // Ubicación
  if (actividad.ubicacion) {
    sections.push('📍 *Ubicación:*');
    sections.push(`Dirección: ${safeValue(actividad.ubicacion.direccion)}`);
    sections.push(`Cómo llegar: ${safeValue(actividad.ubicacion.comoLlegar)}`);
    sections.push(`Referencias: ${safeValue(actividad.ubicacion.referencias)}\n`);
  }
  
  // Contacto
  if (actividad.contacto) {
    sections.push('📞 *Contacto:*');
    sections.push(`Teléfono: ${safeValue(actividad.contacto.telefono)}`);
    sections.push(`WhatsApp: ${safeValue(actividad.contacto.whatsapp)}`);
    sections.push(`Email: ${safeValue(actividad.contacto.email)}`);
    sections.push(`Sitio Web: ${safeValue(actividad.contacto.sitioWeb)}\n`);
  }
  
  // Horarios
  if (actividad.horarios) {
    sections.push('⏰ *Horarios:*');
    sections.push(`General: ${safeValue(actividad.horarios.general)}`);
    sections.push(`Reservas: ${safeValue(actividad.horarios.reservas)}`);
    sections.push(`Duración: ${safeValue(actividad.horarios.duracion || actividad.duracion)}\n`);
  }
  
  // Precios/Menú
  if (actividad.precios) {
    sections.push('💰 *Precios:*');
    sections.push(`Adulto: ${safeValue(actividad.precios.adulto)} ${safeValue(actividad.precios.moneda)}`);
    sections.push(`Niño: ${safeValue(actividad.precios.nino)} ${safeValue(actividad.precios.moneda)}`);
    sections.push(`Descuento grupo: ${safeValue(actividad.precios.descuentoGrupo)}% para mínimo ${safeValue(actividad.precios.grupoMinimo)} personas`);
    sections.push(`Incluye: ${safeValue(actividad.precios.incluye)}\n`);
  } else if (actividad.menu) {
    sections.push('💰 *Menú y Precios:*');
    sections.push(`Especialidades: ${safeValue(actividad.menu.especialidades)}`);
    if (actividad.menu.rangoPrecio) {
      sections.push('Rango de precios:');
      sections.push(`  Entradas: ${safeValue(actividad.menu.rangoPrecio.entradas)}`);
      sections.push(`  Platillos principales: ${safeValue(actividad.menu.rangoPrecio.platillosPrincipales)}`);
      sections.push(`  Postres: ${safeValue(actividad.menu.rangoPrecio.postres)}`);
      sections.push(`  Bebidas: ${safeValue(actividad.menu.rangoPrecio.bebidas)}`);
    }
    sections.push(`Opciones especiales: ${safeValue(actividad.menu.opcionesEspeciales)}\n`);
  }
  
  // Servicios
  if (actividad.servicios) {
    sections.push(`🛎️ *Servicios:*\n${safeValue(actividad.servicios)}\n`);
  }
  
  // Detalles actividad
  const activityDetails = [
    `🎯 *Dificultad:* ${safeValue(actividad.dificultad)}`,
    `Edad mínima: ${safeValue(actividad.edadMinima)}`,
    `Capacidad máxima: ${safeValue(actividad.capacidadMaxima)}`
  ].filter(Boolean).join('\n');
  
  if (activityDetails) sections.push(activityDetails + '\n');
  
  // Disponibilidad
  if (actividad.disponibilidad) {
    sections.push('📅 *Disponibilidad:*');
    sections.push(`Temporada alta: ${safeValue(actividad.disponibilidad.temporadaAlta)}`);
    sections.push(`Temporada baja: ${safeValue(actividad.disponibilidad.temporadaBaja)}`);
    sections.push(`Días cerrados: ${safeValue(actividad.disponibilidad.diasCerrado)}`);
    sections.push(`Clima ideal: ${safeValue(actividad.disponibilidad.climaIdeal)}\n`);
  }
  
  // Multimedia
  if (actividad.multimedia) {
    sections.push('📸 *Multimedia:*');
    sections.push(`Foto principal: ${safeValue(actividad.multimedia.fotoPrincipal)}`);
    if (actividad.multimedia.galeria) {
      sections.push(`Galería:\n${actividad.multimedia.galeria.map(item => `• ${item}`).join('\n')}`);
    }
    sections.push(`Video: ${safeValue(actividad.multimedia.video)}\n`);
  }
  
  // Calificación
  if (actividad.calificacion) {
    sections.push(`⭐ *Calificación promedio:* ${safeValue(actividad.calificacion.promedio)} (${safeValue(actividad.calificacion.totalResenas)} reseñas)\n`);
  }
  
  // Certificaciones e Idiomas
  if (actividad.certificaciones) {
    sections.push(`📜 *Certificaciones:*\n${safeValue(actividad.certificaciones)}\n`);
  }
  if (actividad.idiomas) {
    sections.push(`🗣️ *Idiomas disponibles:* ${safeValue(actividad.idiomas)}\n`);
  }
  
  // Recomendaciones
  if (actividad.recomendaciones) {
    sections.push('🔖 *Recomendaciones:*');
    sections.push(`Qué traer: ${safeValue(actividad.recomendaciones.queTraer)}`);
    sections.push(`No recomendado: ${safeValue(actividad.recomendaciones.noRecomendado)}`);
    sections.push(`Consejos: ${safeValue(actividad.recomendaciones.consejos)}\n`);
  }
  
  // Pie
  sections.push('Escribe "menu" para volver al menú principal.');
  
  return sections.join('\n');
}

async function handleExperienciasLocales(bot, remitente, mensaje, establecerEstado) {
  try {
    const actividades = await loadActividades();
    
    if (!actividades.length) {
      await bot.sendMessage(remitente, { text: '⚠️ No hay actividades disponibles en este momento.' });
      return;
    }
    
    if (!mensaje || mensaje === '3') {
      // Mostrar menú
      const menuItems = actividades.map((act, index) => `${index + 1}. ${act.nombre}`).join('\n');
      const menuMessage = `📋 *Experiencias Locales*:\n${menuItems}\n\nPor favor, selecciona el número o nombre de la actividad.`;
      
      await bot.sendMessage(remitente, { text: menuMessage });
      await establecerEstado(remitente, 'experienciasLocales');
      return;
    }
    
    // Buscar actividad
    const input = mensaje.trim().toLowerCase();
    const numSelection = parseInt(input);
    
    const actividad = Number.isInteger(numSelection) && numSelection > 0 && numSelection <= actividades.length
      ? actividades[numSelection - 1]
      : actividades.find(act => 
          act.id?.toLowerCase() === input || 
          act.nombre?.toLowerCase() === input
        );
    
    if (!actividad) {
      await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número o nombre válido del menú.' });
      return;
    }
    
    const detalles = formatActivityDetails(actividad);
    await bot.sendMessage(remitente, { text: detalles });
    
  } catch (error) {
    console.error('Error en handleExperienciasLocales:', error);
    await bot.sendMessage(remitente, { text: '⚠️ Ocurrió un error al procesar tu solicitud. Por favor, intenta más tarde.' });
  }
}

module.exports = { handleExperienciasLocales };