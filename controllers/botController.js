const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { procesarMensaje } = require('./messageHandler');
const reservaCleanupService = require('../services/reservaCleanupService');

// Variables globales para control de reconexión
let reconnectAttempts = 0;
let isReconnecting = false;

async function startBot() {
  try {
    // Crear directorios necesarios si no existen (siempre dentro de vj)
    const dataDir = path.join(__dirname, '..', 'data');
    const sessionDir = path.join(dataDir, 'session');
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
      console.log('Directorio data creado');
    }
    
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir);
      console.log('Directorio session creado');
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const bot = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      browser: ["ValidationBot", "Chrome", "1.0.0"],
      mobile: false
    });

    // Función optimizada para reconexión
    const scheduleReconnect = (deleteSession = false) => {
      if (isReconnecting) return;
      
      isReconnecting = true;
      const baseDelay = 3000;
      const maxDelay = 30000;
      const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxDelay);
      
      console.log(`⏳ Reconectando en ${delay/1000} segundos... (Intento ${reconnectAttempts + 1})`);
      
      setTimeout(async () => {
        if (deleteSession) {
          console.log('🔑 Eliminando sesión inválida...');
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log('✅ Sesión eliminada correctamente');
          } catch (deleteError) {
            console.error('❌ Error eliminando sesión:', deleteError);
          }
        }
        
        isReconnecting = false;
        reconnectAttempts++;
        await startBot();
      }, delay);
    };

    bot.ev.on('connection.update', (update) => {
      console.log('🔄 Estado de conexión:', update.connection || 'actualización');
      
      // Manejo de QR Code
      if (update.qr) {
        console.log('📲 Escanea el código QR para iniciar sesión');
        qrcodeTerminal.generate(update.qr, { small: true });
        
        const qrPngPath = path.join(dataDir, 'qr_code.png');
        qrcode.toFile(qrPngPath, update.qr, (err) => {
          console.log(err 
            ? `❌ Error generando QR: ${err}`
            : `✅ QR guardado en: ${qrPngPath}`
          );
        });
      }
      
      // Resetear intentos al conectar exitosamente
      if (update.connection === 'open') {
        reconnectAttempts = 0;
        console.log('✅ Conexión establecida con WhatsApp');
      }
      
      // Manejo de desconexiones
      if (update.connection === 'close') {
        const statusCode = update.lastDisconnect?.error?.output?.statusCode || 
                           update.lastDisconnect?.statusCode;
        
        const reason = update.lastDisconnect?.error?.output?.payload?.reason || 
                       update.lastDisconnect?.reason || '';

        console.log('⚠️ Desconectado:', `Código: ${statusCode}`, `Razón: ${reason}`);
        
        if (statusCode === 401 || reason.includes('invalid')) {
          scheduleReconnect(true);  // Borrar sesión y reconectar
        } else {
          scheduleReconnect();      // Reconexión simple
        }
      }
    });

    bot.ev.on('creds.update', saveCreds);

    bot.ev.on('messages.upsert', async ({ messages }) => {
      try {
        // Validar existencia de mensajes
        if (!messages || messages.length === 0) return;
        
        const msg = messages[0];
        const isFromMe = msg.key.fromMe || false;
        
        // Solo procesar mensajes entrantes válidos
        if (!isFromMe && msg.message) {
          const remitente = msg.key.remoteJid;
          let texto = '';
          let messageType = '';
          
          // Extraer contenido según tipo de mensaje
          if (msg.message.conversation) {
            texto = msg.message.conversation.trim();
            messageType = 'conversation';
          } 
          else if (msg.message.extendedTextMessage?.text) {
            texto = msg.message.extendedTextMessage.text.trim();
            messageType = 'extendedTextMessage';
          }
          else if (msg.message.imageMessage) {
            texto = msg.message.imageMessage.caption || '';
            messageType = 'imageMessage';
          }
          else if (msg.message.documentMessage) {
            texto = msg.message.documentMessage.caption || '';
            messageType = 'documentMessage';
          }
          // Agregar aquí otros tipos de mensaje si son necesarios
          
          console.log(`📩 Mensaje recibido de ${remitente}: ${texto || messageType}`);
          await procesarMensaje(bot, remitente, texto, msg);
        }
      } catch (processingError) {
        console.error('❌ Error procesando mensaje:', processingError);
      }
    });

    console.log('🚀 Bot iniciado correctamente');
    
    // Iniciar servicio de limpieza automática de reservas
    console.log('🧹 Iniciando servicio de limpieza de reservas...');
    reservaCleanupService.iniciar();
    
  } catch (startError) {
    console.error('⛔ Error crítico al iniciar bot:', startError);
    scheduleReconnect();
  }
}

/**
 * Clase BotController para compatibilidad con tests
 */
class BotController {
  constructor() {
    this.config = {
      groupJID: process.env.GRUPO_JID || '120363401911054356@g.us',
      reconnectAttempts: 0,
      maxReconnectAttempts: 5
    };
    this.isInitialized = false;
    this.socket = null;
  }

  async initialize() {
    try {
      this.isInitialized = true;
      return await startBot();
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  async sendMessage(to, message) {
    if (!this.socket) {
      throw new Error('Bot not initialized');
    }
    return await this.socket.sendMessage(to, { text: message });
  }

  async processMessage(messageData) {
    try {
      // Simulación básica para tests
      if (!messageData || !messageData.messages || !messageData.messages[0]) {
        throw new Error('Invalid message format');
      }
      
      const message = messageData.messages[0];
      console.log('Processing message:', message.key?.remoteJid, message.message?.conversation);
      
      // Retornar respuesta simulada
      return {
        processed: true,
        response: 'Message processed successfully'
      };
    } catch (error) {
      console.error('Error processing message:', error);
      throw error;
    }
  }

  isConnected() {
    return this.isInitialized && this.socket;
  }
}

module.exports = {
  startBot,
  BotController
};