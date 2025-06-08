const { loadCabañas, safeSave } = require('../services/alojamientosService');

const flowAlojamientosHandler = async (ctx, { provider, flowDynamic, state, endFlow }) => {
  const cabañas = loadCabañas();
  if (cabañas.length === 0) {
    await flowDynamic('⚠️ No hay cabañas disponibles en este momento.');
    return;
  }
  let menu = 'Tenemos estas cabañas disponibles:\\n';
  cabañas.forEach((cabaña, index) => {
    menu += `${index + 1}. ${cabaña.nombre}\\n`;
  });
  menu += 'Por favor, selecciona el número de la cabaña para ver más detalles.';
  await flowDynamic(menu);

  // Capture user selection
  const seleccion = parseInt(ctx.body.trim());
  if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
    await flowDynamic('⚠️ Selección inválida. Por favor, ingresa un número válido del menú.');
    return endFlow();
  }
  const cabaña = cabañas[seleccion - 1];
  let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\\n`;
  detalles += `👥 Capacidad: ${cabaña.capacidad} personas\\n`;
  detalles += `🛏️ Habitaciones: ${cabaña.habitaciones} | 🚿 Baños: ${cabaña.baños}\\n`;
  detalles += `💰 Precio por noche: ${cabaña.precio_noche.toLocaleString()} ${cabaña.moneda}\\n`;
  detalles += `📍 Ubicación: ${cabaña.ubicacion.ciudad}, ${cabaña.ubicacion.departamento}\\n\\n`;
  detalles += `🛋️ Comodidades:\\n`;
  cabaña.comodidades.forEach(item => {
    detalles += `- ${item}\\n`;
  });
  if (cabaña.reservas && cabaña.reservas.length > 0) {
    detalles += `\\n📅 Fechas reservadas:\\n`;
    cabaña.reservas.forEach(reserva => {
      detalles += `- ${reserva.fecha_inicio} a ${reserva.fecha_fin} (${reserva.estado})\\n`;
    });
  }
  if (cabaña.fotos && cabaña.fotos.length > 0) {
    detalles += `\\n🖼️ Fotos:\\n`;
    cabaña.fotos.forEach(url => {
      detalles += `${url}\\n`;
    });
  }
  await flowDynamic(detalles);
};

async function sendAlojamientoDetails(bot, remitente, seleccion) {
  const cabañas = loadCabañas();
  if (seleccion < 1 || seleccion > cabañas.length) {
    await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
    return;
  }
  const cabaña = cabañas[seleccion - 1];
  let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n`;
  detalles += `👥 Capacidad: ${cabaña.capacidad} personas\n`;
  detalles += `🛏️ Habitaciones: ${cabaña.habitaciones} | 🚿 Baños: ${cabaña.baños}\n`;
  detalles += `💰 Precio por noche: ${cabaña.precio_noche.toLocaleString()} ${cabaña.moneda}\n`;
  detalles += `📍 Ubicación: ${cabaña.ubicacion.ciudad}, ${cabaña.ubicacion.departamento}\n\n`;
  detalles += `🛋️ Comodidades:\n`;
  cabaña.comodidades.forEach(item => {
    detalles += `- ${item}\n`;
  });
  if (cabaña.reservas && cabaña.reservas.length > 0) {
    detalles += `\n📅 Fechas reservadas:\n`;
    cabaña.reservas.forEach(reserva => {
      detalles += `- ${reserva.fecha_inicio} a ${reserva.fecha_fin} (${reserva.estado})\n`;
    });
  }
  if (cabaña.fotos && cabaña.fotos.length > 0) {
    await bot.sendMessage(remitente, {
      image: { url: cabaña.fotos[0] },
      caption: detalles
    });
    for (let i = 1; i < cabaña.fotos.length; i++) {
      await bot.sendMessage(remitente, {
        image: { url: cabaña.fotos[i] }
      });
    }
  } else {
    await bot.sendMessage(remitente, { text: detalles });
  }
}

module.exports = { flowAlojamientosHandler, sendAlojamientoDetails };
