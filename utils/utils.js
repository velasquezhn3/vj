const GRUPO_JID = process.env.GRUPO_JID || '120363420483868468@g.us';
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const streamToBuffer = require('stream-to-buffer');

// Función auxiliar para convertir stream a buffer
const streamToBufferPromise = (stream) => new Promise((resolve, reject) => {
  streamToBuffer(stream, (err, buffer) => {
    if (err) return reject(err);
    resolve(buffer);
  });
});

// Función segura para enviar mensajes de texto
async function safeSend(bot, recipient, text) {
  try {
    await bot.sendMessage(recipient, { text });
    return true;
  } catch (error) {
    console.error(`[safeSend] Error al enviar a ${recipient}:`, error.message);
    return false;
  }
}

// Función para validar fechas con formato "DD/MM - DD/MM"
const isValidDate = (fecha) => /^\d{2}\/\d{2}\s*-\s*\d{2}\/\d{2}$/.test(fecha);

// Simulador de confirmación de reserva
const confirmarReserva = async (remitente, reserva) => {
  console.log(`[Reserva] Confirmada para ${remitente}:`, reserva);
  // Implementación real iría aquí
};

// Validador de URLs
const isValidUrl = (urlString) => {
  try {
    return Boolean(new URL(urlString));
  } catch {
    return false;
  }
};

// Simulador de disponibilidad
const validarDisponibilidad = async (fechaEntrada, fechaSalida) => {
  // Lógica real de validación iría aquí
  return !(fechaEntrada === '15/08/2025' && fechaSalida === '18/08/2025');
};

// Enviar mensaje al grupo usando safeSend
const enviarAlGrupo = async (bot, texto) => {
  await safeSend(bot, GRUPO_JID, texto);
};

// Descargar contenido de mensaje como buffer
const descargarContenido = async (messageContent, tipo) => {
  try {
    const stream = await downloadContentFromMessage(messageContent, tipo);
    if (!stream) throw new Error('Stream no disponible');
    return await streamToBufferPromise(stream);
  } catch (error) {
    console.error('[Descarga] Error:', error.message);
    return null;
  }
};

// Reenviar comprobante al grupo
const reenviarComprobanteAlGrupo = async (bot, mensaje, datos) => {
  const nombre = datos?.nombre || 'Cliente desconocido';
  const caption = `✅ Comprobante de ${nombre}`;
  
  try {
    const imageMsg = mensaje.imageMessage || mensaje.message?.imageMessage;
    const documentMsg = mensaje.documentMessage || mensaje.message?.documentMessage;
    
    let buffer = null;
    let tipoContenido = 'desconocido';
    
    if (imageMsg) {
      buffer = await descargarContenido({ imageMessage: imageMsg }, 'image');
      tipoContenido = 'imagen';
    } else if (documentMsg) {
      buffer = await descargarContenido({ documentMessage: documentMsg }, 'document');
      tipoContenido = 'documento';
    }
    
    if (!buffer || buffer.length === 0) {
      throw new Error(`Buffer de ${tipoContenido} vacío`);
    }
    
    if (tipoContenido === 'imagen') {
      await bot.sendMessage(GRUPO_JID, { image: buffer, caption });
    } else if (tipoContenido === 'documento') {
      await bot.sendMessage(GRUPO_JID, { 
        document: buffer, 
        caption,
        mimetype: documentMsg.mimetype || 'application/octet-stream'
      });
    } else {
      throw new Error('Tipo de comprobante no soportado');
    }
    
    console.log(`[Grupo] Comprobante de ${nombre} reenviado (${tipoContenido})`);
  } catch (error) {
    console.error(`[Comprobante] Error para ${nombre}:`, error.message);
    await safeSend(bot, GRUPO_JID, `⚠️ Error con comprobante de ${nombre}: ${error.message}`);
  }
};

module.exports = {
  GRUPO_JID,
  safeSend, // Exportada para uso en otros módulos
  isValidDate,
  confirmarReserva,
  isValidUrl,
  validarDisponibilidad,
  enviarAlGrupo,
  reenviarComprobanteAlGrupo
};