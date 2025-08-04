#!/usr/bin/env node

/**
 * 🖼️ PRUEBA ESPECÍFICA DE IMÁGENES
 * Verifica que las fotos se procesen y envíen correctamente
 */

const { loadMenuCabinTypes } = require('../services/menuCabinTypesService');
const { isValidUrl } = require('../utils/utils');

async function probarImagenes() {
    console.log('🖼️ PRUEBA ESPECÍFICA DE PROCESAMIENTO DE IMÁGENES');
    console.log('================================================');
    
    try {
        // Cargar tipos
        const tipos = await loadMenuCabinTypes();
        
        for (const tipo of tipos) {
            console.log(`\n🏠 === ${tipo.nombre} ===`);
            console.log(`📋 Tipo de fotos: ${typeof tipo.fotos}`);
            
            if (!tipo.fotos) {
                console.log('❌ No hay campo fotos');
                continue;
            }
            
            const fotosContent = Array.isArray(tipo.fotos) ? 
                JSON.stringify(tipo.fotos).substring(0, 100) : 
                tipo.fotos.substring(0, 100);
            console.log(`📄 Contenido raw: ${fotosContent}...`);
            
            try {
                const fotos = Array.isArray(tipo.fotos) ? tipo.fotos : JSON.parse(tipo.fotos);
                console.log(`✅ JSON parseado correctamente. Total fotos: ${fotos.length}`);
                
                const urlsValidas = fotos.filter(url => isValidUrl(url));
                console.log(`✅ URLs válidas: ${urlsValidas.length}/${fotos.length}`);
                
                const imageUrls = urlsValidas.filter(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
                console.log(`✅ URLs de imágenes: ${imageUrls.length}`);
                
                if (imageUrls.length > 0) {
                    console.log(`🖼️ Primera imagen: ${imageUrls[0]}`);
                    console.log(`🖼️ Últimas imágenes: ${imageUrls.slice(-2).join(', ')}`);
                } else {
                    console.log('❌ No se encontraron URLs de imágenes válidas');
                    console.log('📋 URLs encontradas:');
                    fotos.forEach((url, i) => {
                        console.log(`   ${i + 1}. ${url} (Válida: ${isValidUrl(url)}, Es imagen: ${/\.(jpg|jpeg|png|gif|webp)$/i.test(url)})`);
                    });
                }
                
            } catch (parseError) {
                console.log('❌ Error parseando JSON:', parseError.message);
                console.log('📄 Contenido completo:', tipo.fotos);
            }
        }
        
        console.log('\n🧪 SIMULANDO ENVÍO DE MENSAJE CON IMAGEN...');
        
        // Mock del bot para simular envío
        const mockBot = {
            sendMessage: async (remitente, mensaje) => {
                if (mensaje.image) {
                    console.log(`📱 ✅ IMAGEN ENVIADA a ${remitente}`);
                    console.log(`🔗 URL: ${mensaje.image.url}`);
                    if (mensaje.caption) {
                        console.log(`📝 Caption: ${mensaje.caption.substring(0, 100)}...`);
                    }
                } else {
                    console.log(`📱 📝 TEXTO ENVIADO a ${remitente}`);
                    console.log(`💬 Contenido: ${mensaje.text.substring(0, 100)}...`);
                }
                return { success: true };
            }
        };
        
        // Simular envío del primer tipo
        const primerTipo = tipos[0];
        const fotos = Array.isArray(primerTipo.fotos) ? primerTipo.fotos : JSON.parse(primerTipo.fotos);
        const urlsValidas = fotos.filter(url => isValidUrl(url));
        const imageUrls = urlsValidas.filter(url => /\.(jpg|jpeg|png|gif|webp)$/i.test(url));
        
        if (imageUrls.length > 0) {
            await mockBot.sendMessage('test@s.whatsapp.net', {
                image: { url: imageUrls[0] },
                caption: `🏖️ *${primerTipo.nombre}*\n\nPrueba de imagen...`
            });
            
            console.log(`\n✅ Se enviarían ${imageUrls.length} imágenes total`);
        } else {
            console.log('\n❌ No hay imágenes para enviar');
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        console.log(error.stack);
        return false;
    }
}

// Ejecutar prueba
probarImagenes()
    .then(exito => {
        if (exito) {
            console.log('\n🎉 PROCESAMIENTO DE IMÁGENES ANALIZADO');
            console.log('\n🔍 Si las imágenes no se envían en WhatsApp, el problema puede ser:');
            console.log('   1. Conexión de red del bot');
            console.log('   2. URLs de Cloudinary inaccesibles');
            console.log('   3. Configuración de Baileys');
            console.log('   4. Permisos del bot para enviar media');
            process.exit(0);
        } else {
            console.log('\n💥 PROBLEMA EN PROCESAMIENTO');
            process.exit(1);
        }
    })
    .catch(error => {
        console.log('💥 ERROR CRÍTICO:', error);
        process.exit(1);
    });
