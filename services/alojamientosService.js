const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('moment/locale/es');

const DB_PATH = path.join(__dirname, '..', 'data', 'cabañas.json');

if (!fs.existsSync(DB_PATH)) {
  console.warn('Warning: cabañas.json not found at expected path:', DB_PATH);
}

const loadCabañas = () => {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error al cargar cabañas.json:', e);
    return [];
  }
};

const saveCabañas = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const backup = () => {
  const backupDir = path.join(__dirname, '..', 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  const backupPath = path.join(backupDir, `cabañas-${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, backupPath);
};
setInterval(backup, 24 * 60 * 60 * 1000);

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

const checkDisponibilidad = (cabaña, fechaEntrada, fechaSalida) => {
  return !cabaña.reservas.some(reserva => {
    if (reserva.estado !== 'confirmada') return false;
    const resInicio = moment(reserva.fecha_inicio);
    const resFin = moment(reserva.fecha_fin);
    return fechaEntrada.isBefore(resFin) && fechaSalida.isAfter(resInicio);
  });
};

const parsearFechas = (texto) => {
  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };
  
  const match = texto.match(/(\\d{1,2})[\\s\\-]*(?:al?)?[\\s\\-]*(\\d{1,2})?\\s*(?:de)?\\s*(\\w+)/i);
  
  if (!match) return null;
  
  const diaIn = parseInt(match[1]);
  const mesNombre = match[3].toLowerCase();
  const año = new Date().getFullYear();
  
  const diaOut = match[2] ? parseInt(match[2]) : diaIn;
  
  return {
    entrada: moment(new Date(año, meses[mesNombre], diaIn)),
    salida: moment(new Date(año, meses[mesNombre], diaOut))
  };
};

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

module.exports = {
  loadCabañas,
  saveCabañas,
  safeSave,
  checkDisponibilidad,
  parsearFechas,
  addReserva
};
