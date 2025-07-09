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

const GENERAL_INTRODUCTION = `1.- Ver Alojamientos disponibles:\n\n` +
`Muchísimas gracias por tu interés en nuestros servicios en Villas Julie 🤗 podemos ofrecerle las siguientes opciones de alojamiento:\n\n` +
`       1.- Cabaña Tortuga es una apartamento de 1 cuarto y 1 baño para un máximo de 3 personas \n` +
`       2.- Cabaña Caracol, es una cabaña de dos cuartos y dos baños para un máximo de 6 personas. \n` +
`       3.- Cabaña Tiburon, es una cabaña de tres cuartos y dos baños para un máximo de 8 personas. \n\n` +
`Por favor seleccionar que tipo de alojamiento es el de su interés. \n\n` +

`Cabaña Tortuga\n\n` +
`Sera un placer atenderle en las bellas playas de Tela. 🏝En Villas Julie le ofrecemos un Apartamento de un cuarto 🏠 para un Máximo de 3 personas, ubicada a media cuadra de la mejor playa de Tela. \n\n` +

`El Apartamento tiene las siguientes áreas: \n\n` +

`CUARTO\n` +
`Cuenta con una cama matrimonial , una unipersonal, Aire Acondicionado y baño. 🛌 🛁\n\n` +

`COCINETA  \n` +
`🍳Cocineta pequeña  con Refrigeradora pequeña , Estufa de dos hornillas , Microondas, y accesorios básicos de Cocina\n\n` +

`🏊Área de Piscina y área social \n` +
`SON COMPARTIDAS	CON OTROS HUESPEDES de las 6 cabañas del complejo, horario máximo para utilizar hasta las 9 p.m. \n` +
`Pedimos por favor respetar el horario, debemos realizar el mantenimiento adecuado a las piscinas. \n\n` +

`Por seguridad NO se permite alimentos y bebidas en el área de la piscina.\n\n` +

`🍗Hay un pequeño asador de carne el cual con mucho gusto podemos prestarle, solo debe traer su carbón. \n\n` +

`Check IN y Check OUT \n` +
`La hora de Entrada es a la 2:00 p.m. y salida a las 11:00 a.m. \n\n` +

`👩‍💻Wifi\n\n` +

`🚗🚙 1 parqueo\n\n` +

`PROHIBICIONES\n` +
`NO se permite visitas.\n` +
`🚫NO se permiten mascotas 🐶\n` +
`NO llevar nuestras toallas a la playa. \n` +
`🚭No se permite fumar dentro de las cabañas. \n` +
`No tener música a alto volumen después de las 11 p.m. por respeto a los otros huéspedes. \n\n` +

`📖Por favor leer todas las condiciones y estar de acuerdo con ellas para coordinar de la mejor manera su viaje 🤓\n\n` +

`Cabaña Caracol\n\n` +
`Sera un placer atenderle en las bellas playas de Tela. 🏝En Villas Julie le ofrecemos una cabaña  de dos cuartos y dos baños 🏠 para un Máximo de 6 personas, ubicada a media cuadra de la mejor playa de Tela. \n\n` +

`La cabaña tiene las siguientes áreas: \n\n` +

`CUARTOS \n` +
` Cuarto#1 (Principal) con una cama matrimonial , una unipersonal, Aire Acondicionado y baño. 🛌 🛁\n` +
`Cuarto # 2 con una cama matrimonial, una unipersonal, aire acondicionado y baño compartido. \n\n` +

`COCINA \n` +
`🍳Cocina completa con Refrigeradora, Estufa, Microondas, Cafetera, licuadora y accesorios básicos de Cocina\n\n` +

`📺Sala con TV con cable. \n\n` +

`🏊Área de Piscina y área social \n` +
`SON COMPARTIDAS	CON OTROS HUESPEDES de las 6 cabañas del complejo, horario máximo para utilizar hasta las 9 p.m. \n` +
`Pedimos por favor respetar el horario, debemos realizar el mantenimiento adecuado a las piscinas. \n\n` +

`Por seguridad NO se permite alimentos y bebidas en el área de la piscina.\n\n` +

`🍗Hay un pequeño asador de carne el cual con mucho gusto podemos prestarle, solo debe traer su carbón. \n\n` +

`Check IN y Check OUT \n` +
`La hora de Entrada es a la 2:00 p.m. y salida a las 11:00 a.m. \n\n` +

`👩‍💻Wifi\n\n` +

`🚗🚙 2 parqueos \n\n` +

`PROHIBICIONES\n` +
`NO se permite visitas.\n` +
`🚫NO se permiten mascotas 🐶\n` +
`NO llevar nuestras toallas a la playa. \n` +
`🚭No se permite fumar dentro de las cabañas. \n` +
`No tener música a alto volumen después de las 11 p.m. por respeto a los otros huéspedes. \n\n` +

`📖Por favor leer todas las condiciones y estar de acuerdo con ellas para coordinar de la mejor manera su viaje 🤓\n\n` +

`Cabaña Tiburón \n\n` +
`Muchísimas gracias por tu interés en nuestros servicios en Villas Julie 🤗\n\n` +

`Sera un placer atenderle en las bellas playas de Tela. 🏝En Villas Julie le ofrecemos una cabaña 🏠Ubicada a media cuadra de la mejor playa de Tela. \n\n` +

`Está cabaña tiene tres cuartos y dos baños , para un MAXIMO de 8 personas. \n\n` +

`La cabaña tiene las siguientes áreas: \n\n` +

`CUARTOS \n` +
` Cuarto#1 (Principal) con una cama matrimonial , una unipersonal, Aire Acondicionado y baño. 🛌 🛁\n` +
`Cuarto # 2 con una cama matrimonial, una unipersonal, aire acondicionado y baño compartido. \n` +
`Cuarto #3 con dos camas unipersonales, aire acondicionado y baño compartido.\n\n` +

`COCINA \n` +
`🍳Cocina completa con Refrigeradora, Estufa, Microondas, Cafetera, licuadora y accesorios básicos de Cocina\n\n` +

`📺Sala con TV con cable \n\n` +

`🏊Área de Piscina y área social \n` +
`SON COMPARTIDAS	CON OTROS HUESPEDES de las 6 cabañas del complejo, horario máximo para utilizar hasta las 9 p.m. \n` +
`Pedimos por favor respetar el horario, debemos realizar el mantenimiento adecuado a las piscinas. \n` +
`Por seguridad NO se permite alimentos y bebidas en el área de la piscina.\n\n` +

`🍗Hay un pequeño asador de carne el cual con mucho gusto podemos prestarle, solo debe traer su carbón. \n\n` +

`Check IN y Check OUT \n` +
`La hora de Entrada es a la 2:00 p.m. y salida a las 11:00 a.m. \n\n` +

`👩‍💻Wifi\n\n` +

`🚗🚙 2 parqueos \n\n` +

`PROHIBICIONES\n` +
`NO se permite visitas.\n` +
`🚫NO se permiten mascotas 🐶\n` +
`NO llevar nuestras toallas a la playa. \n` +
`🚭No se permite fumar dentro de las cabañas. \n` +
`No tener música a alto volumen después de las 11 p.m. por respeto a los otros huéspedes. \n\n` +

`📖Por favor leer todas las condiciones y estar de acuerdo con ellas para coordinar de la mejor manera su viaje 🤓\n\n`;

const flowAlojamientos = addKeyword(['1', 'alojamiento', 'cabañas'])
  .addAnswer(
    async (ctx, { provider, flowDynamic, state }) => {
      const cabañas = loadCabañas();
      if (cabañas.length === 0) {
        await flowDynamic('⚠️ No hay cabañas disponibles en este momento.');
        return;
      }
      // Send the full general introduction text as is
      await flowDynamic(GENERAL_INTRODUCTION);
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
      // Show the full detailed description from the "descripcion" field again on selection
      let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n\n`;
      // Split description into two parts if too long
      const maxLength = 1000;
      if (cabaña.descripcion.length > maxLength) {
        const firstPart = cabaña.descripcion.substring(0, maxLength);
        const secondPart = cabaña.descripcion.substring(maxLength);
        detalles += `${firstPart}\n\n`;
        await flowDynamic(detalles);
        await flowDynamic(secondPart);
      } else {
        detalles += `${cabaña.descripcion}\n\n`;
        await flowDynamic(detalles);
      }
      await flowDynamic('📅 Por favor, indica las fechas de tu estadía (ejemplo: "15-18 agosto" o "15/08 - 18/08"):');
    },
    { capture: true },
    async (ctx, { flowDynamic, state, endFlow }) => {
      const { cabañaSeleccionada } = await state.getState();
      if (!cabañaSeleccionada) {
        await flowDynamic('⚠️ No se encontró la cabaña seleccionada. Por favor inicia de nuevo.');
        return endFlow();
      }
      const fechas = parsearFechas(ctx.body);
      if (!fechas) {
        await flowDynamic('⚠️ No entendí las fechas. Por favor usa un formato como "15-18 agosto" o "15/08 - 18/08".');
        return;
      }
      const disponible = checkDisponibilidad(cabañaSeleccionada, fechas.entrada, fechas.salida);
      if (!disponible) {
        await flowDynamic(`⚠️ Lo sentimos, ${cabañaSeleccionada.nombre} no está disponible en esas fechas.`);
        return;
      }
      await state.update({
        reservaTemporal: {
          cabañaId: cabañaSeleccionada.id,
          fechas,
          estado: 'pendiente'
        }
      });
      await flowDynamic('✅ ¡Disponible! Por favor ingresa tu nombre completo para continuar con la reserva:');
    },
    { capture: true },
    async (ctx, { flowDynamic, state, endFlow }) => {
      const { reservaTemporal } = await state.getState();
      if (!reservaTemporal) {
        await flowDynamic('⚠️ No se encontró información de reserva. Por favor inicia de nuevo.');
        return endFlow();
      }
      const nombre = ctx.body.trim();
      if (nombre.length < 3) {
        await flowDynamic('⚠️ Por favor ingresa un nombre válido.');
        return;
      }
      const reservaData = {
        nombre,
        fechas: reservaTemporal.fechas,
        estado: 'confirmada',
        timestamp: new Date().toISOString()
      };
      const exito = await addReserva(reservaTemporal.cabañaId, reservaData);
      if (exito) {
        await flowDynamic('🎉 ¡Reserva confirmada! Gracias por elegir Villas Julie. Te esperamos.');
      } else {
        await flowDynamic('⚠️ Hubo un error al guardar la reserva. Por favor intenta de nuevo.');
      }
      return endFlow();
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
