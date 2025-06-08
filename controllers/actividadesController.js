const { loadActividades } = require('../services/actividadesService');

const flowActividadesHandler = async (ctx, { provider, flowDynamic, state, endFlow }) => {
  const actividades = loadActividades();
  if (actividades.length === 0) {
    await flowDynamic('⚠️ No hay actividades disponibles en este momento.');
    return;
  }
  let menu = 'Tenemos estas actividades disponibles:\\n';
  actividades.forEach((actividad, index) => {
    menu += `${index + 1}. ${actividad.nombre}\\n`;
  });
  menu += 'Por favor, selecciona el número de la actividad para ver más detalles.';
  await flowDynamic(menu);

  // Capture user selection
  const seleccion = parseInt(ctx.body.trim());
  if (isNaN(seleccion) || seleccion < 1 || seleccion > actividades.length) {
    await flowDynamic('⚠️ Selección inválida. Por favor, ingresa un número válido del menú.');
    return endFlow();
  }
  const actividad = actividades[seleccion - 1];
  let detalles = `🏞️ *${actividad.nombre}*\\n`;
  detalles += `📍 Ubicación: ${actividad.ubicacion.direccion}\\n`;
  detalles += `⏰ Duración: ${actividad.duracion}\\n`;
  detalles += `💰 Precio adulto: ${actividad.precios?.adulto ?? 'N/A'} ${actividad.precios?.moneda || 'HNL'}\\n`;
  detalles += `💰 Precio niño: ${actividad.precios?.nino ?? 'N/A'} ${actividad.precios?.moneda || 'HNL'}\\n`;
  detalles += `📅 Horarios: ${actividad.horarios.general}\\n`;
  detalles += `📝 Descripción: ${actividad.descripcionCorta || actividad.descripcion}\\n\\n`;
  detalles += `Servicios:\\n`;
  (actividad.servicios || []).forEach(servicio => {
    detalles += `- ${servicio}\\n`;
  });
  detalles += `\\nRecomendaciones:\\n`;
  (actividad.recomendaciones?.queTraer || []).forEach(item => {
    detalles += `- ${item}\\n`;
  });
  detalles += `\\nContacto:\\n`;
  detalles += `Teléfono: ${actividad.contacto.telefono}\\n`;
  detalles += `WhatsApp: ${actividad.contacto.whatsapp}\\n`;
  detalles += `Email: ${actividad.contacto.email}\\n`;
  detalles += `Sitio Web: ${actividad.contacto.sitioWeb}\\n`;
  detalles += `Redes Sociales:\\n`;
  Object.entries(actividad.contacto.redesSociales).forEach(([key, value]) => {
    detalles += `- ${key}: ${value}\\n`;
  });
  if (actividad.multimedia && actividad.multimedia.fotoPrincipal) {
    detalles += `\\n🖼️ Fotos:\\n`;
    (actividad.multimedia.galeria || []).forEach(url => {
      detalles += `${url}\\n`;
    });
  }
  await flowDynamic(detalles);
};

async function sendActividadDetails(bot, remitente, seleccion) {
  const actividades = loadActividades();
  if (seleccion < 1 || seleccion > actividades.length) {
    await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
    return;
  }
  const actividad = actividades[seleccion - 1];
  let detalles = `🏞️ *${actividad.nombre}*\n`;
  detalles += `📍 Ubicación: ${actividad.ubicacion.direccion}\n`;
  detalles += `⏰ Duración: ${actividad.duracion}\n`;
  detalles += `💰 Precio adulto: ${actividad.precios?.adulto ?? 'N/A'} ${actividad.precios?.moneda || 'HNL'}\n`;
  detalles += `💰 Precio niño: ${actividad.precios?.nino ?? 'N/A'} ${actividad.precios?.moneda || 'HNL'}\n`;
  detalles += `📅 Horarios: ${actividad.horarios.general}\n`;
  detalles += `📝 Descripción: ${actividad.descripcionCorta || actividad.descripcion}\n\n`;
  detalles += `Servicios:\n`;
  (actividad.servicios || []).forEach(servicio => {
    detalles += `- ${servicio}\n`;
  });
  detalles += `\nRecomendaciones:\n`;
  (actividad.recomendaciones?.queTraer || []).forEach(item => {
    detalles += `- ${item}\n`;
  });
  detalles += `\nContacto:\n`;
  detalles += `Teléfono: ${actividad.contacto.telefono}\n`;
  detalles += `WhatsApp: ${actividad.contacto.whatsapp}\n`;
  detalles += `Email: ${actividad.contacto.email}\n`;
  detalles += `Sitio Web: ${actividad.contacto.sitioWeb}\n`;
  detalles += `Redes Sociales:\n`;
  Object.entries(actividad.contacto.redesSociales).forEach(([key, value]) => {
    detalles += `- ${key}: ${value}\n`;
  });
  if (actividad.multimedia && actividad.multimedia.fotoPrincipal) {
    await bot.sendMessage(remitente, {
      image: { url: actividad.multimedia.fotoPrincipal },
      caption: detalles
    });
    if (actividad.multimedia.galeria && actividad.multimedia.galeria.length > 0) {
      for (const url of actividad.multimedia.galeria) {
        await bot.sendMessage(remitente, {
          image: { url }
        });
      }
    }
  } else {
    await bot.sendMessage(remitente, { text: detalles });
  }
}

module.exports = { flowActividadesHandler, sendActividadDetails };
