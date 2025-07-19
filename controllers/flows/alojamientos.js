const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('moment/locale/es');
const { addKeyword } = require('@bot-whatsapp/bot');

// ====================
// 1. Configuración inicial
// ====================
const DB_PATH = path.join(__dirname, '..', 'cabañas.json');
const BACKUP_DIR = path.join(__dirname, 'backups');
moment.locale('es');

// ====================
// 2. Funciones de utilidad
// ====================
const safeReadFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`Error reading file ${filePath}:`, e);
    return null;
  }
};

const safeWriteFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`Error writing file ${filePath}:`, e);
    return false;
  }
};

// ====================
// 3. Gestión de datos
// ====================
const loadCabañas = () => {
  const data = safeReadFile(DB_PATH);
  if (!data) {
    console.warn('No se encontró el archivo de cabañas, creando uno vacío');
    safeWriteFile(DB_PATH, []);
    return [];
  }
  
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing cabañas data:', e);
    return [];
  }
};

const createBackup = () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    const backupPath = path.join(BACKUP_DIR, `cabañas_${timestamp}.json`);
    fs.copyFileSync(DB_PATH, backupPath);
    
    // Mantener solo los últimos 5 backups
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('cabañas_') && file.endsWith('.json'))
      .sort()
      .reverse();
    
    if (backups.length > 5) {
      for (const file of backups.slice(5)) {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
      }
    }
  } catch (e) {
    console.error('Error creating backup:', e);
  }
};

// Crear backup inicial
createBackup();

// ====================
// 4. Funciones de negocio
// ====================
const checkDisponibilidad = (cabaña, fechaEntrada, fechaSalida) => {
  if (!cabaña.reservas) return true;
  
  return !cabaña.reservas.some(reserva => {
    if (reserva.estado !== 'confirmada') return false;
    
    const resInicio = moment(reserva.fecha_inicio);
    const resFin = moment(reserva.fecha_fin);
    
    return fechaEntrada.isBefore(resFin) && fechaSalida.isAfter(resInicio);
  });
};

const parsearFechas = (texto) => {
  // Formato 1: "15-18 agosto"
  let match = texto.match(/(\d{1,2})\s*[-a]+\s*(\d{1,2})\s+(?:de\s+)?(\w+)/i);
  
  // Formato 2: "15/08 - 18/08"
  if (!match) {
    match = texto.match(/(\d{1,2})\/(\d{1,2})\s*[-a]+\s*(\d{1,2})\/(\d{1,2})/i);
  }
  
  if (!match) return null;
  
  const añoActual = moment().year();
  let entrada, salida;
  
  if (match[3] && match[3].match(/[a-z]/i)) {
    // Formato de texto: "15-18 agosto"
    const mesNombre = match[3].toLowerCase();
    const meses = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    
    if (!meses[mesNombre]) return null;
    
    entrada = moment({ year: añoActual, month: meses[mesNombre], day: parseInt(match[1]) });
    salida = moment({ year: añoActual, month: meses[mesNombre], day: parseInt(match[2]) });
  } else {
    // Formato numérico: "15/08 - 18/08"
    entrada = moment(`${parseInt(match[1])}/${parseInt(match[2])}/${añoActual}`, 'DD/MM/YYYY');
    salida = moment(`${parseInt(match[3])}/${parseInt(match[4])}/${añoActual}`, 'DD/MM/YYYY');
  }
  
  // Validar fechas
  if (!entrada.isValid() || !salida.isValid() || salida.isBefore(entrada)) {
    return null;
  }
  
  return { entrada, salida };
};

const addReserva = async (cabañaId, reservaData) => {
  const cabañas = loadCabañas();
  const cabañaIndex = cabañas.findIndex(c => c.id === cabañaId);
  
  if (cabañaIndex === -1) return false;
  
  // Crear array de reservas si no existe
  if (!cabañas[cabañaIndex].reservas) {
    cabañas[cabañaIndex].reservas = [];
  }
  
  cabañas[cabañaIndex].reservas.push(reservaData);
  createBackup(); // Crear backup antes de guardar
  return safeWriteFile(DB_PATH, cabañas);
};

// ====================
// 5. Descripciones modularizadas
// ====================
const CABANA_DESCRIPCIONES = {
  tortuga: {
    nombre: 'Cabaña Tortuga',
    descripcion: `Sera un placer atenderle en las bellas playas de Tela. 🏝En Villas Julie le ofrecemos un Apartamento de un cuarto 🏠 para un Máximo de 3 personas, ubicada a media cuadra de la mejor playa de Tela.

    **CUARTO**
    Cuenta con una cama matrimonial, una unipersonal, Aire Acondicionado y baño. 🛌 🛁
    
    **COCINETA**  
    🍳 Cocineta pequeña con Refrigeradora pequeña, Estufa de dos hornillas, Microondas, y accesorios básicos de Cocina
    
    **ÁREA DE PISCINA**
    Compartida con otros huéspedes, horario máximo hasta las 9 p.m.
    Por seguridad NO se permite alimentos y bebidas en el área de la piscina.
    🍗 Hay un pequeño asador de carne disponible (traer carbón).
    
    **HORARIOS**
    Check-in: 2:00 PM | Check-out: 11:00 AM
    
    **SERVICIOS**
    👩‍💻 Wifi | 🚗 1 parqueo
    
    **NORMAS**
    - NO se permiten visitas
    - 🚫 NO mascotas 🐶
    - NO llevar toallas a la playa
    - 🚭 Prohibido fumar dentro
    - Respetar el silencio después de las 11 PM`
  },
  caracol: {
    nombre: 'Cabaña Caracol',
    descripcion: `Sera un placer atenderle en las bellas playas de Tela. 🏝En Villas Julie le ofrecemos una cabaña de dos cuartos y dos baños 🏠 para un Máximo de 6 personas.

    **CUARTOS** 
    - Principal: cama matrimonial + unipersonal, A/C, baño
    - Secundario: cama matrimonial + unipersonal, A/C, baño compartido
    
    **COCINA** 
    🍳 Cocina completa con Refrigeradora, Estufa, Microondas, Cafetera
    
    **ÁREAS COMUNES**
    📺 Sala con TV | 🏊 Piscina compartida (hasta 9 PM)
    🍗 Asador disponible (traer carbón)
    
    **HORARIOS**
    Check-in: 2:00 PM | Check-out: 11:00 AM
    
    **SERVICIOS**
    👩‍💻 Wifi | 🚗🚙 2 parqueos
    
    **NORMAS**
    - NO visitas
    - 🚫 NO mascotas
    - NO toallas en playa
    - 🚭 Prohibido fumar
    - Silencio después de 11 PM`
  },
  tiburon: {
    nombre: 'Cabaña Tiburón',
    descripcion: `Sera un placer atenderle en las bellas playas de Tela. 🏝 Cabaña con tres cuartos y dos baños para 8 personas.

    **CUARTOS**
    - Principal: cama matrimonial + unipersonal, A/C, baño
    - Secundario: cama matrimonial + unipersonal, A/C
    - Terciario: 2 camas unipersonales, A/C
    
    **COCINA** 
    🍳 Completa con Refrigeradora, Estufa, Microondas
    
    **ÁREAS COMUNES**
    📺 Sala con TV | 🏊 Piscina compartida (hasta 9 PM)
    🍗 Asador disponible (traer carbón)
    
    **HORARIOS**
    Check-in: 2:00 PM | Check-out: 11:00 AM
    
    **SERVICIOS**
    👩‍💻 Wifi | 🚗🚙 2 parqueos
    
    **NORMAS**
    - NO visitas
    - 🚫 NO mascotas
    - NO toallas en playa
    - 🚭 Prohibido fumar
    - Silencio después de 11 PM`
  }
};

// ====================
// 6. Flujo de conversación
// ====================
const flowAlojamientos = addKeyword(['1', 'alojamiento', 'cabañas'])
  .addAnswer(
    '🏖️ *Villas Julie - Opciones de Alojamiento*\n\n' +
    '1. Cabaña Tortuga - Apartamento (1 cuarto, 3 personas)\n' +
    '2. Cabaña Caracol - Cabaña (2 cuartos, 6 personas)\n' +
    '3. Cabaña Tiburón - Cabaña (3 cuartos, 8 personas)\n\n' +
    'Por favor selecciona el número de la opción que te interesa:',
    { capture: true },
    async (ctx, { flowDynamic, endFlow }) => {
      const cabañas = loadCabañas();
      const seleccion = parseInt(ctx.body.trim());

      if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
        await flowDynamic('⚠️ Selección inválida. Por favor ingresa solo el número (1, 2 o 3).');
        return endFlow();
      }

      if (seleccion === 2) {
        // Redirect to reservation flow by setting user state and prompting for dates
        const { establecerEstado } = require('../../services/stateService');
        const { ESTADOS_RESERVA } = require('../reservaConstants');
        await establecerEstado(ctx.from, ESTADOS_RESERVA.FECHAS);
        await flowDynamic('Has seleccionado reservar una cabaña. Por favor ingresa las fechas de tu estadía (ej: "20/08/2025 - 25/08/2025"):');
        return endFlow();
      }

      const cabaña = cabañas[seleccion - 1];
      const cabañaKey = cabaña.nombre.toLowerCase().includes('tortuga') ? 'tortuga' : 
                        cabaña.nombre.toLowerCase().includes('caracol') ? 'caracol' : 'tiburon';

      // Enviar descripción en partes
      const descParts = CABANA_DESCRIPCIONES[cabañaKey].descripcion.split('\n\n');
      for (const part of descParts) {
        await flowDynamic(part);
      }

      await flowDynamic('📅 Por favor, indica las fechas de tu estadía (ej: "15-18 agosto" o "15/08 - 18/08"):');
      return { cabañaSeleccionada: cabaña };
    }
  )
  .addAnswer(
    { capture: true },
    async (ctx, { flowDynamic, state, endFlow }) => {
      const { cabañaSeleccionada } = await state.getState();
      if (!cabañaSeleccionada) {
        await flowDynamic('⚠️ Error: No se encontró la cabaña seleccionada. Por favor inicia de nuevo.');
        return endFlow();
      }

      const fechas = parsearFechas(ctx.body);
      if (!fechas) {
        await flowDynamic('⚠️ Formato de fecha no reconocido. Por favor usa:\n' +
                         '- "15-18 agosto"\n' +
                         '- "15/08 - 18/08"\n' +
                         '- "15 al 18 de agosto"');
        return;
      }

      // Validar fechas futuras
      if (fechas.entrada.isBefore(moment(), 'day')) {
        await flowDynamic('⚠️ La fecha de entrada no puede ser en el pasado.');
        return;
      }

      // Validar estadía mínima (2 noches)
      const noches = fechas.salida.diff(fechas.entrada, 'days');
      if (noches < 2) {
        await flowDynamic('⚠️ La estadía mínima es de 2 noches.');
        return;
      }

      const disponible = checkDisponibilidad(cabañaSeleccionada, fechas.entrada, fechas.salida);
      if (!disponible) {
        await flowDynamic(`⚠️ Lo sentimos, *${cabañaSeleccionada.nombre}* no está disponible del ${fechas.entrada.format('DD/MM')} al ${fechas.salida.format('DD/MM')}.`);
        return;
      }

      await state.update({ 
        reservaTemporal: {
          cabañaId: cabañaSeleccionada.id,
          fechas,
          estado: 'pendiente',
          noches
        }
      });

      await flowDynamic(`✅ *¡Disponible!*\n\n` +
        `*${cabañaSeleccionada.nombre}* disponible del ${fechas.entrada.format('DD/MM')} al ${fechas.salida.format('DD/MM')} (${noches} noches).\n\n` +
        `Por favor ingresa tu nombre completo para continuar:`);
    }
  )
  .addAnswer(
    { capture: true },
    async (ctx, { flowDynamic, state, endFlow }) => {
      const { reservaTemporal } = await state.getState();
      if (!reservaTemporal) {
        await flowDynamic('⚠️ Error: Información de reserva no encontrada. Por favor inicia de nuevo.');
        return endFlow();
      }

      const nombre = ctx.body.trim();
      if (nombre.split(' ').length < 2 || nombre.length < 5) {
        await flowDynamic('⚠️ Por favor ingresa tu nombre completo (al menos nombre y apellido).');
        return;
      }

      const reservaData = {
        nombre,
        fecha_inicio: reservaTemporal.fechas.entrada.format('YYYY-MM-DD'),
        fecha_fin: reservaTemporal.fechas.salida.format('YYYY-MM-DD'),
        estado: 'pendiente',
        timestamp: new Date().toISOString(),
        noches: reservaTemporal.noches
      };

      const exito = await addReserva(reservaTemporal.cabañaId, reservaData);
      if (exito) {
        await flowDynamic(
          '🎉 *¡Reserva confirmada!*\n\n' +
          `Gracias ${nombre} por elegir Villas Julie.\n\n` +
          `*Detalles de tu reserva:*\n` +
          `- Cabaña: ${reservaTemporal.cabañaId}\n` +
          `- Fechas: ${reservaData.fecha_inicio} al ${reservaData.fecha_fin}\n` +
          `- Noches: ${reservaData.noches}\n\n` +
          `Te contactaremos pronto para finalizar el proceso. ¡Bienvenido!`
        );
      } else {
        await flowDynamic('⚠️ Hubo un error al guardar la reserva. Por favor intenta de nuevo o contacta directamente por WhatsApp.');
      }
      return endFlow();
    }
  );

module.exports = { flowAlojamientos, addReserva };