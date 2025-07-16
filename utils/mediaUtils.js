const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function descargarMedia(mensaje) {
  let tipoMedia, mediaMessage, extension;

  if (mensaje.imageMessage) {
    tipoMedia = 'image';
    mediaMessage = mensaje.imageMessage;
    extension = 'jpg';
  } else if (mensaje.documentMessage) {
    tipoMedia = 'document';
    mediaMessage = mensaje.documentMessage;
    extension = mediaMessage.fileName.split('.').pop() || 'bin';
  } else {
    throw new Error('Tipo multimedia no soportado');
  }

  const stream = await downloadContentFromMessage(mediaMessage, tipoMedia);

  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  return {
    buffer,
    mimetype: mediaMessage.mimetype || (tipoMedia === 'image' ? 'image/jpeg' : 'application/octet-stream'),
    nombreArchivo: `comprobante-${Date.now()}.${extension}`
  };
}

module.exports = { descargarMedia };
