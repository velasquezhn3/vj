#!/usr/bin/env node

const { procesarMensaje } = require('./controllers/flows/messageProcessor');

// Mock del bot
const mockBot = {
    sendMessage: async (to, data) => {
        console.log(`📱 Mensaje a ${to}:`);
        if (data.text) {
            console.log(`💬 ${data.text.substring(0, 200)}${data.text.length > 200 ? '...' : ''}`);
        } else {
            console.log(`💬 ${JSON.stringify(data)}`);
        }
        console.log('---');
    }
};

async function testGlobalMenuCommand() {
    console.log('🧪 Probando comando "menu" global...\n');
    
    const testPhone = '50400000000@s.whatsapp.net';
    
    try {
        // Test 1: Desde estado normal
        console.log('1️⃣ Test: Escribir "menu" desde cualquier estado');
        await procesarMensaje(mockBot, testPhone, 'menu', { body: 'menu' });
        
        console.log('\n2️⃣ Test: Escribir "1" desde cualquier estado');  
        await procesarMensaje(mockBot, testPhone, '1', { body: '1' });
        
        console.log('\n3️⃣ Test: Escribir "MENU" (mayúsculas) desde cualquier estado');
        await procesarMensaje(mockBot, testPhone, 'MENU', { body: 'MENU' });
        
        console.log('\n4️⃣ Test: Escribir "Menu" (capitalizado) desde cualquier estado');
        await procesarMensaje(mockBot, testPhone, 'Menu', { body: 'Menu' });
        
        console.log('\n✅ Todas las pruebas completadas');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    }
}

// Ejecutar las pruebas
testGlobalMenuCommand();
