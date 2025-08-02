const { loadActividades } = require('../services/actividadesService');
const { safeSend } = require('../utils/utils'); // Asumiendo que safeSend está en utils

// Función para generar detalles textuales de una actividad
const generateActivityDetails = (actividad) => {
  let detalles = `🏞️ *${actividad.nombre}*\n`;
  detalles += `📍 Ubicación: ${actividad.ubicacion.direccion}\n`;
  detalles += `⏰ Duración: ${actividad.duracion}\n`;
  
  detalles += `💰 Precio adulto: Lmps. ${actividad.precios?.adulto ?? 'N/A'}\n`;
  detalles += `💰 Precio niño: Lmps. ${actividad.precios?.nino ?? 'N/A'}\n`;
  
  detalles += `📅 Horarios: ${actividad.horarios.general}\n`;
  detalles += `📝 Descripción: ${actividad.descripcionCorta || actividad.descripcion}\n\n`;
  
  if (actividad.servicios?.length > 0) {
    detalles += `Servicios:\n`;
    detalles += actividad.servicios.map(servicio => `- ${servicio}`).join('\n') + '\n\n';
  }
  
  if (actividad.recomendaciones?.queTraer?.length > 0) {
    detalles += `Recomendaciones:\n`;
    detalles += actividad.recomendaciones.queTraer.map(item => `- ${item}`).join('\n') + '\n\n';
  }
  
  detalles += `Contacto:\n`;
  detalles += `Teléfono: ${actividad.contacto.telefono}\n`;
  detalles += `WhatsApp: ${actividad.contacto.whatsapp}\n`;
  detalles += `Email: ${actividad.contacto.email}\n`;
  
  if (actividad.contacto.sitioWeb) {
    detalles += `Sitio Web: ${actividad.contacto.sitioWeb}\n`;
  }
  
  if (Object.keys(actividad.contacto.redesSociales).length > 0) {
    detalles += `Redes Sociales:\n`;
    detalles += Object.entries(actividad.contacto.redesSociales)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n') + '\n';
  }
  
  return detalles;
};

// Función para enviar fotos de actividad
const sendActivityPhotos = async (bot, remitente, multimedia) => {
  if (!multimedia) return;
  
  try {
    // Enviar foto principal
    if (multimedia.fotoPrincipal) {
      await bot.sendMessage(remitente, { image: { url: multimedia.fotoPrincipal } });
    }
    
    // Enviar galería si existe
    if (multimedia.galeria?.length > 0) {
      for (const url of multimedia.galeria) {
        await bot.sendMessage(remitente, { image: { url } });
      }
    }
  } catch (error) {
    console.error('Error enviando fotos de actividad:', error);
    await safeSend(bot, remitente, '⚠️ No se pudieron cargar las fotos de la actividad');
  }
};

// Handler para flujo de actividades
const flowActividadesHandler = async (ctx, { flowDynamic, endFlow }) => {
  try {
    const actividades = loadActividades();
    
    if (!actividades || actividades.length === 0) {
      await flowDynamic('⚠️ No hay actividades disponibles en este momento.');
      return endFlow();
    }
    
    // Generar menú dinámico
    const menu = [
      'Tenemos estas actividades disponibles:',
      ...actividades.map((act, idx) => `${idx + 1}. ${act.nombre}`),
      'Selecciona el número de la actividad para ver más detalles.'
    ].join('\n');
    
    await flowDynamic(menu);

    // Validar selección
    const seleccion = parseInt(ctx.body.trim());
    if (isNaN(seleccion)) {
      await flowDynamic('⚠️ Por favor ingresa solo el número de la actividad.');
      return endFlow();
    }
    
    if (seleccion < 1 || seleccion > actividades.length) {
      await flowDynamic(`⚠️ Selección inválida. Ingresa un número entre 1 y ${actividades.length}.`);
      return endFlow();
    }
    
    const actividad = actividades[seleccion - 1];
    const detalles = generateActivityDetails(actividad);
    
    await flowDynamic(detalles);
    
    // Notificar sobre fotos si existen
    if (actividad.multimedia) {
      await flowDynamic('🖼️ Enviando fotos de la actividad...');
    }
    
  } catch (error) {
    console.error('Error en flowActividadesHandler:', error);
    await flowDynamic('⚠️ Ocurrió un error al procesar las actividades. Por favor intenta más tarde.');
    return endFlow();
  }
};

// Enviar detalles de actividad específica
const sendActividadDetails = async (bot, remitente, seleccion) => {
  try {
    const actividades = loadActividades();
    
    if (!actividades || actividades.length === 0) {
      await safeSend(bot, remitente, '⚠️ No hay actividades disponibles en este momento.');
      return;
    }
    
    if (isNaN(seleccion)) {
      await safeSend(bot, remitente, '⚠️ Por favor ingresa solo el número de la actividad.');
      return;
    }
    
    if (seleccion < 1 || seleccion > actividades.length) {
      await safeSend(bot, remitente, `⚠️ Selección inválida. Ingresa un número entre 1 y ${actividades.length}.`);
      return;
    }
    
    const actividad = actividades[seleccion - 1];
    const detalles = generateActivityDetails(actividad);
    
    // Enviar foto principal como imagen con caption si existe
    if (actividad.multimedia?.fotoPrincipal) {
      try {
        await bot.sendMessage(remitente, {
          image: { url: actividad.multimedia.fotoPrincipal },
          caption: detalles
        });
      } catch (error) {
        console.error('Error enviando imagen principal, enviando solo texto:', error);
        await safeSend(bot, remitente, detalles);
      }
    } else {
      await safeSend(bot, remitente, detalles);
    }
    
    // Enviar fotos adicionales de la galería
    await sendActivityPhotos(bot, remitente, actividad.multimedia);
    
  } catch (error) {
    console.error('Error en sendActividadDetails:', error);
    await safeSend(bot, remitente, '⚠️ Ocurrió un error al mostrar la actividad. Por favor intenta más tarde.');
  }
};

module.exports = { 
  flowActividadesHandler, 
  sendActividadDetails 
};