const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcodeTerminal = require('qrcode-terminal');
const qrcode = require('qrcode');
const fs = require('fs/promises');
const path = require('path');

// Configuración global
const SESSION_DIR = path.join('data', 'session');
const QR_CODE_PATH = path.join('data', 'qr_code.png');
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 3000;

// Estado de reconexión
let reconnectAttempts = 0;
let isReconnecting = false;
let activeSocket = null;

async function iniciarBot(procesarMensajeCallback) {
    try {
        if (isReconnecting) return;
        
        // Crear directorios si no existen
        await ensureDirectories();
        
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        
        const bot = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ["ValidationBot", "Chrome", "1.0.0"],
            mobile: false,
            markOnlineOnConnect: true,
            getMessage: async () => undefined // Ignorar mensajes antiguos
        });
        
        activeSocket = bot;
        
        // Registrar eventos
        setupEventHandlers(bot, saveCreds, procesarMensajeCallback);
        
        console.log('🚀 Bot inicializado. Esperando conexión...');
    } catch (error) {
        console.error('⛔ Error crítico al iniciar bot:', error);
        await handleCriticalError();
    }
}

async function ensureDirectories() {
    try {
        await fs.mkdir('data', { recursive: true });
        await fs.mkdir(SESSION_DIR, { recursive: true });
        console.log('✅ Directorios verificados');
    } catch (dirError) {
        console.error('❌ Error creando directorios:', dirError);
        throw dirError;
    }
}

function setupEventHandlers(bot, saveCreds, procesarMensajeCallback) {
    // Manejo de actualizaciones de conexión
    bot.ev.on('connection.update', async (update) => {
        console.log(`🔄 Estado conexión: ${update.connection || 'actualización'} | QR: ${!!update.qr}`);
        
        // Manejo de QR Code
        if (update.qr) {
            await handleQrCode(update.qr);
        }
        
        // Conexión exitosa
        if (update.connection === 'open') {
            reconnectAttempts = 0;
            console.log('✅ Conexión establecida con WhatsApp');
        }
        
        // Manejo de desconexiones
        if (update.connection === 'close') {
            await handleConnectionClose(update, procesarMensajeCallback);
        }
    });

    // Actualización de credenciales
    bot.ev.on('creds.update', saveCreds);

    // Recepción de mensajes
    bot.ev.on('messages.upsert', async ({ messages }) => {
        if (!messages || messages.length === 0) return;
        
        try {
            const msg = messages[0];
            if (shouldProcessMessage(msg)) {
                const { sender, text, messageType } = extractMessageContent(msg);
                if (text || messageType === 'imageMessage' || messageType === 'documentMessage') {
                    console.log(`📩 Mensaje de ${sender}: ${text || messageType}`);
                    console.log('msg keys:', Object.keys(msg));
                    console.log('msg.message keys:', Object.keys(msg.message));
                    console.log('msg.key:', msg.key);
                    console.log('msg.message:', msg.message);
                    console.log('msg.message.imageMessage:', msg.message.imageMessage);
                    console.log('msg.message.documentMessage:', msg.message.documentMessage);
                    console.log('msg.message.conversation:', msg.message.conversation);
                    console.log('msg.message.extendedTextMessage:', msg.message.extendedTextMessage);
                    await procesarMensajeCallback(bot, sender, text, msg);
                }
            }
        } catch (msgError) {
            console.error('❌ Error procesando mensaje:', msgError);
        }
    });
}

async function handleQrCode(qrData) {
    console.log('🔑 Escanea el código QR para iniciar sesión');
    
    // Mostrar QR en terminal
    qrcodeTerminal.generate(qrData, { small: true });
    
    // Generar archivo PNG
    try {
        await qrcode.toFile(QR_CODE_PATH, qrData);
        console.log(`✅ QR guardado en: ${QR_CODE_PATH}`);
    } catch (qrError) {
        console.error('❌ Error generando QR:', qrError);
    }
    
    // Generar Data URL (útil para interfaces web)
    try {
        const dataUrl = await qrcode.toDataURL(qrData);
        console.log('ℹ️ Data URL del QR:', dataUrl.substring(0, 60) + '...');
    } catch (urlError) {
        console.error('❌ Error generando Data URL:', urlError);
    }
}

async function handleConnectionClose(update, callback) {
    const { lastDisconnect } = update;
    const statusCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.statusCode;
    const reason = lastDisconnect?.error?.output?.payload?.reason || DisconnectReason[statusCode] || 'unknown';
    
    console.log(`⚠️ Desconectado: Código ${statusCode} (${reason})`);
    
    // Manejar reconexión basado en el motivo
    if (shouldDeleteSession(statusCode, reason)) {
        console.log('🔑 Sesión inválida. Eliminando...');
        await deleteSession();
    }
    
    await scheduleReconnection(callback);
}

function shouldDeleteSession(statusCode, reason) {
    return statusCode === DisconnectReason.invalidSession || 
           statusCode === DisconnectReason.authFailure ||
           reason.includes('invalid') ||
           reason.includes('401');
}

async function deleteSession() {
    try {
        await fs.rm(SESSION_DIR, { recursive: true, force: true });
        console.log('✅ Sesión eliminada correctamente');
    } catch (delError) {
        console.error('❌ Error eliminando sesión:', delError);
    }
}

async function scheduleReconnection(callback) {
    if (isReconnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('✋ Máximo de intentos alcanzado. Deteniendo...');
        return;
    }
    
    isReconnecting = true;
    reconnectAttempts++;
    
    // Backoff exponencial con límite máximo
    const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
        30000 // 30 segundos máximo
    );
    
    console.log(`⏳ Reconectando en ${delay/1000} segundos (Intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setTimeout(async () => {
        isReconnecting = false;
        await iniciarBot(callback);
    }, delay);
}

function shouldProcessMessage(msg) {
    const result = (
        !msg.key.fromMe && 
        msg.message && 
        !isProtocolMessage(msg) &&
        !isEphemeralMessage(msg)
    );
    console.log(`shouldProcessMessage: ${result} for message keys: ${Object.keys(msg.message)}`);
    return result;
}

function isProtocolMessage(msg) {
    return (
        msg.message.protocolMessage ||
        msg.message.editedMessage ||
        msg.message.reactionMessage
    );
}

function isEphemeralMessage(msg) {
    return msg.message.ephemeralMessage;
}

function extractMessageContent(msg) {
    const sender = msg.key.remoteJid;
    let text = '';
    
    // Manejar diferentes tipos de mensajes
    const messageContent = msg.message;
    
    if (messageContent.conversation) {
        text = messageContent.conversation.trim();
    } 
    else if (messageContent.extendedTextMessage?.text) {
        text = messageContent.extendedTextMessage.text.trim();
    }
    else if (messageContent.imageMessage?.caption) {
        text = messageContent.imageMessage.caption.trim();
    }
    else if (messageContent.videoMessage?.caption) {
        text = messageContent.videoMessage.caption.trim();
    }
    else if (messageContent.documentMessage?.caption) {
        text = messageContent.documentMessage.caption.trim();
    }
    
    return { sender, text };
}

async function handleCriticalError() {
    console.log('🛑 Intentando recuperación de error crítico...');
    try {
        await deleteSession();
        reconnectAttempts = 0;
        await scheduleReconnection();
    } catch (recoveryError) {
        console.error('💥 Error irrecuperable:', recoveryError);
        process.exit(1);
    }
}

module.exports = {
    iniciarBot,
    getActiveSocket: () => activeSocket
};