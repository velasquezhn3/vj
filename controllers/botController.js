/**
 * Controlador para iniciar el bot WhatsApp usando directamente la librería baileys,
 * sin usar '@bot-whatsapp/bot' para evitar problemas con la API desconocida.
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { procesarMensaje } = require('./messageHandler');

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(path.join('data', 'session'));

    const bot = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ["ValidationBot", "Chrome", "1.0.0"],
      mobile: false
    });

    bot.ev.on('connection.update', (update) => {
      console.log('Connection update event:', JSON.stringify(update, null, 2));
      if (update.qr) {
        console.log('QR code event received');
        qrcodeTerminal.generate(update.qr, { small: true });

        const qrPngPath = path.join('data', 'qr_code.png');
        qrcode.toFile(qrPngPath, update.qr, { type: 'png' }, (err) => {
          if (err) {
            console.error('Error generating QR code PNG:', err);
          } else {
            console.log(`QR code PNG saved to file: ${qrPngPath}`);
          }
        });
      }
      if (update.connection) {
        console.log('Connection update:', update.connection);
      }
      if (update.lastDisconnect) {
        console.log('Last disconnect info:', JSON.stringify(update.lastDisconnect, null, 2));
        const statusCode = update.lastDisconnect.error?.output?.statusCode || update.lastDisconnect.statusCode;
        const reason = update.lastDisconnect.error?.output?.payload?.reason || '';
        console.log('Last disconnect status code:', statusCode);
        console.log('Last disconnect reason:', reason);
        if (statusCode === 401 || reason === 'invalid_session') {
          console.log('Unauthorized or invalid session, deleting session and restarting...');
          const sessionPath = path.join('data', 'session');
          fs.rm(sessionPath, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error('Error deleting session files:', err);
            } else {
              console.log('Session files deleted successfully.');
            }
            setTimeout(startBot, 3000);
          });
          return;
        }
      }
      if (update.connection === 'close') {
        console.log('Connection closed, restarting bot in 3 seconds...');
        setTimeout(startBot, 3000);
      }
    });

    bot.ev.on('creds.update', saveCreds);

    bot.ev.on('messages.upsert', async ({ messages }) => {
      console.log('Mensaje recibido:', messages);
      const msg = messages[0];
      if (!msg.key.fromMe && msg.message) {
        const remitente = msg.key.remoteJid;
        let texto = '';

        if (msg.message.conversation) {
          texto = msg.message.conversation.trim();
        } else if (msg.message.extendedTextMessage) {
          texto = msg.message.extendedTextMessage.text.trim();
        }

        if (texto) {
          await procesarMensaje(bot, remitente, texto, msg.message);
        }
      }
    });

    console.log('🔔 BOT INICIADO - ESCANEE EL CÓDIGO QR');
  } catch (error) {
    console.error('Error al iniciar el bot:', error);
  }
}

module.exports = {
  startBot,
};
