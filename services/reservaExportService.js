const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'cabañas.json');
const EXPORT_PATH = path.join(__dirname, '..', 'data', 'reservas_export.xlsx');

async function exportarReservasAExcel() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Archivo de cabañas no encontrado');
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const cabañas = JSON.parse(data);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reservas');

    worksheet.columns = [
      { header: 'ID Cabaña', key: 'id', width: 15 },
      { header: 'Nombre Cabaña', key: 'nombre', width: 30 },
      { header: 'Nombre Cliente', key: 'cliente', width: 30 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 15 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Timestamp', key: 'timestamp', width: 25 }
    ];

    cabañas.forEach(cabaña => {
      if (Array.isArray(cabaña.reservas)) {
        cabaña.reservas.forEach(reserva => {
          worksheet.addRow({
            id: cabaña.id,
            nombre: cabaña.nombre,
            cliente: reserva.nombre || 'N/A',
            fecha_inicio: reserva.fecha_inicio,
            fecha_fin: reserva.fecha_fin,
            estado: reserva.estado,
            timestamp: reserva.timestamp || 'N/A'
          });
        });
      }
    });

    await workbook.xlsx.writeFile(EXPORT_PATH);
    return EXPORT_PATH;
  } catch (error) {
    console.error('Error exportando reservas a Excel:', error);
    throw error;
  }
}

module.exports = {
  exportarReservasAExcel
};
