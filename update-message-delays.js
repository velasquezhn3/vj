/**
 * Script para reemplazar automáticamente todas las instancias de bot.sendMessage
 * con sendMessageWithDelay en el messageProcessor.js
 */

const fs = require('fs');
const path = require('path');

const filePath = './controllers/flows/messageProcessor.js';

console.log('🔄 Actualizando todas las llamadas bot.sendMessage con delay aleatorio...');

try {
    // Leer el archivo
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Contar las instancias originales
    const originalMatches = content.match(/bot\.sendMessage\(/g);
    const originalCount = originalMatches ? originalMatches.length : 0;
    
    console.log(`📊 Encontradas ${originalCount} instancias de bot.sendMessage`);
    
    if (originalCount === 0) {
        console.log('✅ No hay más instancias que reemplazar');
        return;
    }
    
    // Reemplazar todas las instancias de bot.sendMessage( con sendMessageWithDelay(bot, 
    // pero solo las que no son await bot.sendMessage(GRUPO_JID, ... (para no afectar los mensajes del grupo)
    
    // Primero protegemos las llamadas al grupo
    content = content.replace(/await bot\.sendMessage\(GRUPO_JID/g, '__PROTECTED_GROUP_CALL__');
    
    // Ahora reemplazamos las instancias normales
    content = content.replace(/bot\.sendMessage\(/g, 'sendMessageWithDelay(bot, ');
    content = content.replace(/await bot\.sendMessage\(/g, 'await sendMessageWithDelay(bot, ');
    content = content.replace(/return bot\.sendMessage\(/g, 'return sendMessageWithDelay(bot, ');
    
    // Restauramos las llamadas al grupo
    content = content.replace(/__PROTECTED_GROUP_CALL__/g, 'await bot.sendMessage(GRUPO_JID');
    
    // Verificar el resultado
    const newMatches = content.match(/sendMessageWithDelay\(bot,/g);
    const newCount = newMatches ? newMatches.length : 0;
    
    const remainingMatches = content.match(/bot\.sendMessage\(/g);
    const remainingCount = remainingMatches ? remainingMatches.length : 0;
    
    console.log(`✅ Reemplazadas ${newCount} instancias con sendMessageWithDelay`);
    console.log(`📋 Quedan ${remainingCount} instancias sin reemplazar (probablemente mensajes al grupo)`);
    
    // Escribir el archivo actualizado
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('💾 Archivo actualizado exitosamente');
    console.log('⏳ Ahora todos los mensajes tendrán un delay aleatorio de 4-15 segundos');
    
} catch (error) {
    console.error('❌ Error actualizando el archivo:', error.message);
}
