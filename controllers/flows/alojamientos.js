const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('moment/locale/es');
const { addKeyword } = require('@bot-whatsapp/bot');

// 1. Sistema de archivos para "base de datos"
const DB_PATH = path.join(__dirname, '..', 'cabañas.json');

// Crear archivo si no existe con datos iniciales
// Removed initial data creation to avoid overwriting user data
if (!fs.existsSync(DB_PATH)) {
  console.warn('Warning: cabañas.json not found at expected path:', DB_PATH);
}

// Función para cargar datos
const loadCabañas = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    console.log('Contenido cargado de cabañas.json:', data);
    return JSON.parse(data);
  } catch (e) {
    console.error('Error al cargar cabañas.json:', e);
    return [];
  }
};

// Función para guardar datos
const saveCabañas = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Backup automático cada 24 horas
const backup = () => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  const backupPath = path.join(backupDir, `cabañas-${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, backupPath);
};
setInterval(backup, 24 * 60 * 60 * 1000);

// Guardar datos con lock para evitar concurrencia
const safeSave = async (data) => {
  const lockFile = DB_PATH + '.lock';

  while (fs.existsSync(lockFile)) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  try {
    fs.writeFileSync(lockFile, '');
    saveCabañas(data);
  } finally {
    fs.unlinkSync(lockFile);
  }
};

// 2. Función para verificar disponibilidad
const checkDisponibilidad = (cabaña, fechaEntrada, fechaSalida) => {
  return !cabaña.reservas.some(reserva => {
    if (reserva.estado !== 'confirmada') return false;
    const resInicio = moment(reserva.fecha_inicio);
    const resFin = moment(reserva.fecha_fin);
    return fechaEntrada.isBefore(resFin) && fechaSalida.isAfter(resInicio);
  });
};

// 3. Función para parsear fechas (mejorada)
const parsearFechas = (texto) => {
  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };
  
  // Manejar múltiples formatos: "15-18 agosto", "15 al 18 de agosto"
  const match = texto.match(/(\d{1,2})[\s\-]*(?:al?)?[\s\-]*(\d{1,2})?\s*(?:de)?\s*(\w+)/i);
  
  if (!match) return null;
  
  const diaIn = parseInt(match[1]);
  const mesNombre = match[3].toLowerCase();
  const año = new Date().getFullYear();
  
  // Si no hay día final, usar mismo día (estadía de 1 noche)
  const diaOut = match[2] ? parseInt(match[2]) : diaIn;
  
  return {
    entrada: moment(new Date(año, meses[mesNombre], diaIn)),
    salida: moment(new Date(año, meses[mesNombre], diaOut))
  };
};

// 4. Flujo principal actualizado
const flowAlojamientos = addKeyword(['1', 'alojamiento', 'cabañas'])
  .addAnswer(
    async (ctx, { provider, flowDynamic, state }) => {
      const cabañas = loadCabañas();
      if (cabañas.length === 0) {
        await flowDynamic('⚠️ No hay cabañas disponibles en este momento.');
        return;
      }
      let menu = 'Tenemos estas cabañas disponibles:\n';
      cabañas.forEach((cabaña, index) => {
        menu += `${index + 1}. ${cabaña.nombre}\n`;
      });
      menu += 'Por favor, selecciona el número de la cabaña para ver más detalles.';
      await flowDynamic(menu);
    },
    { capture: true },
    async (ctx, { provider, flowDynamic, state, endFlow }) => {
      const cabañas = loadCabañas();
      const seleccion = parseInt(ctx.body.trim());
      if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
        await flowDynamic('⚠️ Selección inválida. Por favor, ingresa un número válido del menú.');
        return endFlow();
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
        detalles += `\n🖼️ Fotos:\n`;
        cabaña.fotos.forEach(url => {
          detalles += `${url}\n`;
        });
      }
      await flowDynamic(detalles);
    }
  );

// 5. Función para agregar reservas
const addReserva = async (cabañaId, reservaData) => {
  const cabañas = loadCabañas();
  const cabañaIndex = cabañas.findIndex(c => c.id === cabañaId);
  
  if (cabañaIndex !== -1) {
    cabañas[cabañaIndex].reservas.push(reservaData);
    await safeSave(cabañas);
    return true;
  }
  return false;
};

module.exports = { flowAlojamientos, addReserva };
