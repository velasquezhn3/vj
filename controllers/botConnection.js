/**
 * Módulo para la conexión y gestión del ciclo de vida del bot WhatsApp.
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function iniciarBot(procesarMensajeCallback) {
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
        console.log('QR code received, scan please:');
        qrcodeTerminal.generate(update.qr, { small: true });

        // Generate QR code PNG file and log data URL
        const qrPngPath = path.join('data', 'qr_code.png');
        qrcode.toFile(qrPngPath, update.qr, { type: 'png' }, (err) => {
          if (err) {
            console.error('Error generating QR code PNG:', err);
          } else {
            console.log(`QR code PNG saved to file: ${qrPngPath}`);
          }
        });

        qrcode.toDataURL(update.qr, (err, url) => {
          if (err) {
            console.error('Error generating QR code data URL:', err);
          } else {
            console.log('QR code data URL:', url);
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
          // Delete session files to force re-authentication
          const sessionPath = path.join('data', 'session');
          fs.rm(sessionPath, { recursive: true, force: true }, (err) => {
            if (err) {
              console.error('Error deleting session files:', err);
            } else {
              console.log('Session files deleted successfully.');
            }
            setTimeout(() => iniciarBot(procesarMensajeCallback), 3000);
          });
          return; // Prevent further restart until deletion completes
        }
      }
      if (update.connection === 'close') {
        console.log('Connection closed, attempting to reconnect...');
        // Instead of restarting the whole bot, try to reconnect gracefully
        setTimeout(() => {
          console.log('Reconnecting...');
          iniciarBot(procesarMensajeCallback);
        }, 3000);
      }
    });

    // Add event to handle auth state updates and save credentials
    bot.ev.on('creds.update', async () => {
      try {
        await saveCreds();
        console.log('Credentials updated and saved successfully.');
      } catch (error) {
        console.error('Error saving credentials:', error);
      }
    });

    bot.ev.on('creds.update', saveCreds);

    bot.ev.on('messages.upsert', async ({ messages }) => {
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
          await procesarMensajeCallback(bot, remitente, texto, msg.message);
        }
      }
    });

    console.log('🔔 BOT INICIADO - ESCANEE EL CÓDIGO QR');
  } catch (error) {
    console.error('Error al iniciar el bot:', error);
  }
}

module.exports = {
  iniciarBot
};
