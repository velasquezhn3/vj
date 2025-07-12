const GRUPO_JID = process.env.GRUPO_JID || '120363420483868468@g.us';

/**
 * Valida formato de fecha para reservas (ej: "25/12 - 30/12")
 * @param {string} fecha - Texto con fechas a validar
 * @returns {boolean} True si el formato es válido
 */
function isValidDate(fecha) {
  return /^\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}$/.test(fecha);
}

/**
 * Simula confirmación de reserva (implementación real iría aquí)
 * @param {string} remitente - Número del usuario
 * @param {object} reserva - Detalles de la reserva
 */
async function confirmarReserva(remitente, reserva) {
  console.log(`Reserva confirmada para ${remitente}:`, reserva);
  // Lógica real de reserva iría aquí
}

/**
 * Valida formato de URL
 * @param {string} urlString - URL a validar
 * @returns {boolean} True si es URL válida
 */
function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida disponibilidad de fechas (simulación)
 * @param {string} fechaEntrada 
 * @param {string} fechaSalida 
 * @returns {boolean} True si está disponible
 */
async function validarDisponibilidad(fechaEntrada, fechaSalida) {
  // Lógica real de validación iría aquí
  return !(fechaEntrada === '15/08/2025' && fechaSalida === '18/08/2025');
}

/**
 * Envía mensaje de texto al grupo designado
 * @param {object} bot - Instancia del bot de WhatsApp
 * @param {string} texto - Contenido del mensaje
 */
async function enviarAlGrupo(bot, texto) {
  try {
    await bot.sendMessage(GRUPO_JID, { text: texto });
  } catch (error) {
    console.error('Error enviando al grupo:', error);
    // No reintentar para evitar bucles de error
  }
}

/**
 * Reenvía comprobante al grupo con información contextual
 * @param {object} bot - Instancia del bot
 * @param {object} mensaje - Objeto del mensaje original
 * @param {object} datos - Información adicional del usuario
 */
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const streamToBuffer = require('stream-to-buffer');

async function streamToBufferPromise(stream) {
  return new Promise((resolve, reject) => {
    streamToBuffer(stream, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}

async function reenviarComprobanteAlGrupo(bot, mensaje, datos) {
  try {
    const nombre = datos?.nombre || 'Cliente desconocido';
    const caption = `✅ Comprobante de ${nombre}`;

    const imageMsg = mensaje.imageMessage || mensaje.message?.imageMessage;
    const documentMsg = mensaje.documentMessage || mensaje.message?.documentMessage;

    if (imageMsg) {
      console.log('Descargando imagen...');
      const stream = await downloadContentFromMessage({ imageMessage: imageMsg }, 'image');
      if (!stream) {
        console.error('No se pudo obtener el stream de la imagen.');
        return;
      }
      const buffer = await streamToBufferPromise(stream);
      if (!buffer || buffer.length === 0) {
        console.error('Buffer de imagen vacío o inválido.');
        return;
      }
      console.log('Reenviando imagen al grupo...');
      try {
        await bot.sendMessage(GRUPO_JID, { 
          image: buffer, 
          caption 
        });
        console.log('Imagen reenviada correctamente');
      } catch (err) {
        console.error('Error enviando imagen al grupo:', err);
      }
    } else if (documentMsg) {
      console.log('Descargando documento...');
      const stream = await downloadContentFromMessage({ documentMessage: documentMsg }, 'document');
      if (!stream) {
        console.error('No se pudo obtener el stream del documento.');
        return;
      }
      const buffer = await streamToBufferPromise(stream);
      if (!buffer || buffer.length === 0) {
        console.error('Buffer de documento vacío o inválido.');
        return;
      }
      console.log('Reenviando documento al grupo...');
      try {
        await bot.sendMessage(GRUPO_JID, { 
          document: buffer, 
          caption,
          mimetype: documentMsg.mimetype || 'application/octet-stream'
        });
        console.log('Documento reenviado correctamente');
      } catch (err) {
        console.error('Error enviando documento al grupo:', err);
      }
    } else {
      console.warn('Intento de reenvío de comprobante no soportado');
      await enviarAlGrupo(bot, `⚠️ Comprobante no reconocido de ${nombre}`);
    }
  } catch (error) {
    console.error('Error reenviando comprobante:', error);
    await enviarAlGrupo(bot, '⚠️ Error procesando comprobante');
  }
}

module.exports = {
  GRUPO_JID,
  isValidDate,
  confirmarReserva,
  isValidUrl,
  validarDisponibilidad,
  enviarAlGrupo,
  reenviarComprobanteAlGrupo
};
