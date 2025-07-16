const Reserva = require('../models/Reserva');
const fs = require('fs');
const path = require('path');

const COMPROBANTES_DIR = path.join(__dirname, '../../admin-frontend/public/comprobantes');

if (!fs.existsSync(COMPROBANTES_DIR)) {
  fs.mkdirSync(COMPROBANTES_DIR, { recursive: true });
}

async function guardarComprobante(reservaId, buffer, mimetype, nombreArchivo) {
  try {
    console.log('guardarComprobante llamado con reservaId:', reservaId, 'nombreArchivo:', nombreArchivo);
    // Save file to disk
    const filePath = path.join(COMPROBANTES_DIR, `${reservaId}-${Date.now()}-${nombreArchivo}`);
    await fs.promises.writeFile(filePath, buffer);
    console.log('Archivo guardado en disco:', filePath);

    // Store relative path in DB
    const relativePath = `/comprobantes/${path.basename(filePath)}`;
    console.log('Ruta relativa para DB:', relativePath);

    const resultado = await Reserva.updateComprobante(reservaId, null, null, relativePath);
    console.log('Resultado updateComprobante:', resultado);
    return resultado;
  } catch (error) {
    console.error('Error guardando comprobante:', error);
    throw error;
  }
}

async function actualizarEstado(reservaId, nuevoEstado) {
  try {
    return await Reserva.updateEstado(reservaId, nuevoEstado);
  } catch (error) {
    console.error('Error actualizando estado:', error);
    throw error;
  }
}

async function eliminarComprobante(reservaId) {
  try {
    // Delete file from disk if exists
    const reserva = await Reserva.findById(reservaId);
    if (reserva && reserva.comprobante_nombre_archivo) {
      const filePath = path.join(COMPROBANTES_DIR, path.basename(reserva.comprobante_nombre_archivo));
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
    return await Reserva.eliminarComprobante(reservaId);
  } catch (error) {
    console.error('Error eliminando comprobante:', error);
    throw error;
  }
}

module.exports = { guardarComprobante, actualizarEstado, eliminarComprobante };
