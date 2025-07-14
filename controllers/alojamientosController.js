const { loadCabañas } = require('../services/alojamientosService');
const { safeSend } = require('../utils/messageUtils');

// Función para generar detalles textuales de una cabaña
const generateCabinDetails = (cabaña) => {
  let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n`;
  detalles += `👥 Capacidad: ${cabaña.capacidad} personas\n`;
  detalles += `🛏️ Habitaciones: ${cabaña.habitaciones} | 🚿 Baños: ${cabaña.baños}\n`;
  detalles += `💰 Precio por noche: ${cabaña.precio_noche.toLocaleString()} ${cabaña.moneda}\n`;
  detalles += `📍 Ubicación: ${cabaña.ubicacion.ciudad}, ${cabaña.ubicacion.departamento}\n\n`;
  
  detalles += `🛋️ Comodidades:\n`;
  detalles += cabaña.comodidades.map(item => `- ${item}`).join('\n');
  
  if (cabaña.descripcion) {
    detalles += `\n\n📖 Descripción:\n${cabaña.descripcion}`;
  }
  
  if (cabaña.reservas?.length > 0) {
    detalles += `\n\n📅 Fechas reservadas:\n`;
    detalles += cabaña.reservas.map(reserva => 
      `- ${reserva.fecha_inicio} a ${reserva.fecha_fin} (${reserva.estado})`
    ).join('\n');
  }
  
  return detalles;
};

// Función para enviar fotos de la cabaña
const sendCabinPhotos = async (bot, remitente, fotos) => {
  if (!fotos || fotos.length === 0) return;
  
  try {
    // Enviar la primera foto con pie de foto
    await bot.sendMessage(remitente, {
      image: { url: fotos[0] },
      caption: 'Fotos de la cabaña:'
    });
    
    // Enviar las fotos restantes
    for (const foto of fotos.slice(1)) {
      await bot.sendMessage(remitente, { image: { url: foto } });
    }
  } catch (error) {
    console.error('Error enviando fotos:', error);
    await safeSend(bot, remitente, '⚠️ No se pudieron cargar las fotos de la cabaña');
  }
};

// Handler principal para el flujo de alojamientos
const flowAlojamientosHandler = async (ctx, { provider, flowDynamic, state, endFlow }) => {
  const cabañas = loadCabañas();
  
  if (cabañas.length === 0) {
    await flowDynamic('⚠️ No hay cabañas disponibles en este momento.');
    return endFlow();
  }
  
  // Generar menú dinámico
  const menu = [
    'Tenemos estas cabañas disponibles:',
    ...cabañas.map((cabaña, index) => `${index + 1}. ${cabaña.nombre}`),
    'Selecciona el número de la cabaña para ver más detalles.'
  ].join('\n');
  
  await flowDynamic(menu);

  // Validar selección del usuario
  const seleccion = parseInt(ctx.body.trim());
  if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
    await flowDynamic('⚠️ Selección inválida. Por favor, ingresa un número válido del menú.');
    return endFlow();
  }
  
  const cabañaSeleccionada = cabañas[seleccion - 1];
  const detalles = generateCabinDetails(cabañaSeleccionada);
  
  await flowDynamic(detalles);
  
  // Si hay fotos, enviar mensaje adicional
  if (cabañaSeleccionada.fotos?.length > 0) {
    await flowDynamic('🖼️ Enviando fotos de la cabaña...');
  }
};

// Enviar detalles de alojamiento con fotos
const sendAlojamientoDetails = async (bot, remitente, seleccion) => {
  const cabañas = loadCabañas();
  
  if (seleccion < 1 || seleccion > cabañas.length) {
    await safeSend(bot, remitente, '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.');
    return;
  }
  
  const cabaña = cabañas[seleccion - 1];
  const detalles = generateCabinDetails(cabaña);
  
  // Enviar detalles textuales
  await safeSend(bot, remitente, detalles);
  
  // Enviar fotos si existen
  if (cabaña.fotos?.length > 0) {
    await sendCabinPhotos(bot, remitente, cabaña.fotos);
  }
};

module.exports = { 
  flowAlojamientosHandler, 
  sendAlojamientoDetails 
};