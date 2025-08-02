const Reserva = require('../models/Reserva');
const GRUPO_JID = process.env.GRUPO_JID;
const path = require('path');
const fs = require('fs');

async function enviarReservaAlGrupo(bot, reserva) {
  try {
    const resumen = 
"📝 *NUEVA RESERVA - COMPROBANTE RECIBIDO*\n" +
"--------------------------------------\n" +
"🆔 ID: " + reserva.reservation_id + "\n" +
"👤 Nombre: " + (reserva.nombre || 'N/A') + "\n" +
"📞 Teléfono: " + (reserva.telefono || 'N/A') + "\n" +
"📅 Fechas: " + (reserva.fechaEntrada ? reserva.fechaEntrada : 'N/A') + " → " + (reserva.fechaSalida ? reserva.fechaSalida : 'N/A') + "\n" +
"👥 Personas: " + (reserva.personas || 'N/A') + "\n" +
"🏠 Alojamiento: " + (reserva.alojamiento || 'N/A') + "\n" +
"💵 Total: Lmps. " + (reserva.precioTotal || 0) + "\n" +
"--------------------------------------\n" +
"✅ Usa /reservado " + reserva.reservation_id + " para confirmar\n" +
"❌ Usa /cancelar " + reserva.reservation_id + " para rechazar\n";


    const textMessage = await bot.sendMessage(GRUPO_JID, { text: resumen });

    if (reserva.comprobante_nombre_archivo) {
      const rutaAbsoluta = path.join(__dirname, '../admin-frontend/public/comprobantes', reserva.comprobante_nombre_archivo);

      if (fs.existsSync(rutaAbsoluta)) {
        const buffer = fs.readFileSync(rutaAbsoluta);
        const ext = path.extname(rutaAbsoluta).toLowerCase();

        if (ext === '.pdf') {
          await bot.sendMessage(GRUPO_JID, {
            document: buffer,
            fileName: path.basename(rutaAbsoluta),
            mimetype: 'application/pdf',
            caption: "📎 Comprobante de pago - Reserva " + reserva._id
          });
        } else if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
          await bot.sendMessage(GRUPO_JID, {
            image: buffer,
            caption: "📎 Comprobante de pago - Reserva " + reserva._id
          });
        } else {
          console.warn("[Grupo] Tipo de archivo no soportado para comprobante: " + ext);
        }
      } else {
        console.warn("[Grupo] Archivo no encontrado: " + rutaAbsoluta);
      }

      // Send separate message with /reservado command and reservation id after sending comprobante
      await bot.sendMessage(GRUPO_JID, { text: "/reservado " + reserva.reservation_id });
    }

    // Send separate message with /reservado command and reservation id
    // await bot.sendMessage(GRUPO_JID, { text: "/reservado " + reserva.reservation_id });

    await Reserva.findByIdAndUpdate(reserva._id, {
      grupoMessageId: textMessage.key.id
    });
  } catch (error) {
    console.error('Error enviando reserva al grupo:', error);
  }
}

module.exports = { enviarReservaAlGrupo };
