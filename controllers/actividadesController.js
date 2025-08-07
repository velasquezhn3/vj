const { loadActividades } = require('../services/menuActivitiesService');
const { safeSend } = require('../utils/utils'); // Asumiendo que safeSend está en utils

// Función para generar detalles textuales de una actividad
const generateActivityDetails = (actividad) => {
  let detalles = `� *${actividad.nombre}*\n`;
  
  if (actividad.categoria) {
    detalles += `� Categoría: ${actividad.categoria}\n`;
  }
  
  if (actividad.ubicacion && actividad.ubicacion.direccion) {
    detalles += `�📍 Ubicación: ${actividad.ubicacion.direccion}\n`;
  }
  
  if (actividad.duracion) {
    detalles += `⏰ Duración: ${actividad.duracion}\n`;
  }
  
  if (actividad.precios) {
    if (actividad.precios.adulto) {
      detalles += `💰 Precio adulto: L. ${actividad.precios.adulto}\n`;
    }
    if (actividad.precios.nino) {
      detalles += `💰 Precio niño: L. ${actividad.precios.nino}\n`;
    }
  }
  
  if (actividad.horarios && actividad.horarios.general) {
    detalles += `📅 Horarios: ${actividad.horarios.general}\n`;
  }
  
  const descripcion = actividad.descripcionCorta || actividad.descripcion_corta || actividad.descripcion;
  if (descripcion) {
    detalles += `📝 Descripción: ${descripcion}\n\n`;
  }
  
  if (actividad.servicios && Array.isArray(actividad.servicios) && actividad.servicios.length > 0) {
    detalles += `✨ Servicios incluidos:\n`;
    detalles += actividad.servicios.map(servicio => `• ${servicio}`).join('\n') + '\n\n';
  }
  
  if (actividad.recomendaciones && actividad.recomendaciones.queTraer && Array.isArray(actividad.recomendaciones.queTraer) && actividad.recomendaciones.queTraer.length > 0) {
    detalles += `🎒 Qué traer:\n`;
    detalles += actividad.recomendaciones.queTraer.map(item => `• ${item}`).join('\n') + '\n\n';
  }
  
  if (actividad.contacto) {
    detalles += `📞 Contacto:\n`;
    if (actividad.contacto.telefono) {
      detalles += `• Teléfono: ${actividad.contacto.telefono}\n`;
    }
    if (actividad.contacto.whatsapp) {
      detalles += `• WhatsApp: ${actividad.contacto.whatsapp}\n`;
    }
    if (actividad.contacto.email) {
      detalles += `• Email: ${actividad.contacto.email}\n`;
    }
    if (actividad.contacto.sitioWeb) {
      detalles += `• Sitio Web: ${actividad.contacto.sitioWeb}\n`;
    }
    
    if (actividad.contacto.redesSociales && typeof actividad.contacto.redesSociales === 'object') {
      const redes = Object.keys(actividad.contacto.redesSociales);
      if (redes.length > 0) {
        detalles += `• Redes Sociales:\n`;
        detalles += Object.entries(actividad.contacto.redesSociales)
          .map(([key, value]) => `  - ${key}: ${value}`)
          .join('\n') + '\n';
      }
    }
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
    const actividades = await loadActividades();
    
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
const sendActividadDetails = async (bot, remitente, seleccion, establecerEstado = null) => {
  try {
    const actividades = await loadActividades();
    
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
    
    // Enviar menú post-actividad después de las fotos
    const menuPostActividad = `\n🔄 *¿Qué deseas hacer ahora?*\n1️⃣ Ver más actividades\n0️⃣ Menú principal`;
    await safeSend(bot, remitente, menuPostActividad);
    
    // Establecer estado post-actividad si se proporciona la función
    if (establecerEstado && typeof establecerEstado === 'function') {
      await establecerEstado(remitente, 'post_actividad');
    }
    
  } catch (error) {
    console.error('Error en sendActividadDetails:', error);
    await safeSend(bot, remitente, '⚠️ Ocurrió un error al mostrar la actividad. Por favor intenta más tarde.');
  }
};

module.exports = { 
  flowActividadesHandler, 
  sendActividadDetails 
};