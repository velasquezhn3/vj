const Reserva = require('../models/Reserva');
const GRUPO_JID = process.env.GRUPO_JID;
const path = require('path');
const fs = require('fs');

async function enviarReservaAlGrupo(bot, reserva) {
  try {
    const resumen = 
"📝 *NUEVA RESERVA - COMPROBANTE RECIBIDO*\n" +
"--------------------------------------\n" +
"🆔 ID: " + reserva._id + "\n" +
"👤 Nombre: " + reserva.nombre + "\n" +
"📞 Teléfono: " + reserva.telefono + "\n" +
"📅 Fechas: " + reserva.fechaInicio.toISOString().split('T')[0] + " → " + reserva.fechaFin.toISOString().split('T')[0] + "\n" +
"👥 Personas: " + reserva.personas + "\n" +
"🏠 Alojamiento: " + reserva.alojamiento.nombre + "\n" +
"💵 Total: $" + reserva.precioTotal + "\n" +
"--------------------------------------\n" +
"✅ Usa /reservado " + reserva._id + " para confirmar\n" +
"❌ Usa /cancelar " + reserva._id + " para rechazar\n";

    const textMessage = await bot.sendMessage(GRUPO_JID, { text: resumen });

    if (reserva.comprobante_nombre_archivo) {
      const rutaAbsoluta = path.join(__dirname, '../admin-frontend/public/comprobantes', reserva.comprobante_nombre_archivo);

      if (fs.existsSync(rutaAbsoluta)) {
        const buffer = fs.readFileSync(rutaAbsoluta);

        await bot.sendMessage(GRUPO_JID, {
          document: buffer,
          fileName: path.basename(rutaAbsoluta),
          mimetype: 'application/pdf',
          caption: "📎 Comprobante de pago - Reserva " + reserva._id
        });
      } else {
        console.warn("[Grupo] Archivo no encontrado: " + rutaAbsoluta);
      }
    }

    await Reserva.findByIdAndUpdate(reserva._id, {
      grupoMessageId: textMessage.key.id
    });
  } catch (error) {
    console.error('Error enviando reserva al grupo:', error);
  }
}

module.exports = { enviarReservaAlGrupo };
