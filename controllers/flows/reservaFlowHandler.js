const { establecerEstado } = require('../../services/stateService');
const { calcularPrecioTotal } = require('../../services/reservaPriceService');
const { enviarAlGrupo, reenviarComprobanteAlGrupo } = require('../../utils/utils');
const { ESTADOS_RESERVA } = require('../reservaConstants');

// Funciones auxiliares para mejorar la legibilidad
const parsearFechas = (texto) => {
    const [entrada, salida] = texto.split('-').map(s => s.trim());
    return { entrada, salida };
};

const validarFormatoFecha = (fecha) => {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(fecha);
};

const calcularDiferenciaDias = (entrada, salida) => {
    const fechaEntrada = new Date(entrada.split('/').reverse().join('-'));
    const fechaSalida = new Date(salida.split('/').reverse().join('-'));
    return Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
};

const asignarAlojamiento = (personas) => {
    if (personas <= 3) return 'Cabaña Tortuga';
    if (personas <= 6) return 'Cabaña Caracol';
    if (personas <= 9) return 'Cabaña Tiburón';
    return null;
};

async function handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje) {
    try {
        switch (estado) {
            case ESTADOS_RESERVA.FECHAS: {
                const { entrada, salida } = parsearFechas(mensajeTexto);
                
                if (!entrada || !salida) {
                    await bot.sendMessage(remitente, { text: '❌ Formato incorrecto. Usa: *20/08/2025 - 25/08/2025*' });
                    return;
                }
                
                if (!validarFormatoFecha(entrada) || !validarFormatoFecha(salida)) {
                    await bot.sendMessage(remitente, { text: '📅 Formato de fecha inválido. Usa *DD/MM/AAAA*' });
                    return;
                }
                
                const noches = calcularDiferenciaDias(entrada, salida);
                
                if (noches < 1) {
                    await bot.sendMessage(remitente, { text: '❌ La fecha de salida debe ser *posterior* a la entrada' });
                    return;
                }
                
                // Simulación de disponibilidad (reemplazar con lógica real)
                const disponible = true; 
                
                if (!disponible) {
                    await bot.sendMessage(remitente, { text: '❌ Fechas no disponibles. Intenta con otras:' });
                    return;
                }
                
                await bot.sendMessage(remitente, { 
                    text: `✅ *¡Fechas disponibles!*\n${noches} noches seleccionadas\n\n📝 *Por favor, dime tu nombre completo:*` 
                });
                
                await establecerEstado(remitente, ESTADOS_RESERVA.NOMBRE, { 
                    fechaEntrada: entrada, 
                    fechaSalida: salida, 
                    noches 
                });
                break;
            }

            case ESTADOS_RESERVA.NOMBRE: {
                const telefono = remitente.split('@')[0];
                await bot.sendMessage(remitente, { text: '👥 *¿Cuántas personas serán?*' });
                await establecerEstado(remitente, ESTADOS_RESERVA.PERSONAS, { 
                    ...datos, 
                    nombre: mensajeTexto.trim(),
                    telefono 
                });
                break;
            }

            case ESTADOS_RESERVA.PERSONAS: {
                const cantidad = parseInt(mensajeTexto);
                
                if (isNaN(cantidad) || cantidad < 1) {
                    await bot.sendMessage(remitente, { text: '🔢 Por favor ingresa un *número válido* (ej: 4)' });
                    return;
                }
                
                const alojamiento = asignarAlojamiento(cantidad);
                
                if (!alojamiento) {
                    await bot.sendMessage(remitente, {
                        text: `⚠️ *Capacidad excedida* (${cantidad} personas)\nSugerencia: Alquila múltiples cabañas`
                    });
                    return;
                }
                
                await bot.sendMessage(remitente, {
                    text: `🏠 *Asignado automáticamente:*\n*${alojamiento}* para ${cantidad} persona(s)`
                });
                
                try {
                    const precioTotal = calcularPrecioTotal(
                        alojamiento, 
                        datos.fechaEntrada, 
                        datos.noches
                    );
                    
                    await bot.sendMessage(remitente, { 
                        text: `💵 *Precio total:* $${precioTotal}\n\n📄 *¿Aceptas las condiciones de uso?* (responde *sí* o *no*)` 
                    });
                    
                    await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                        ...datos,
                        personas: cantidad,
                        alojamiento,
                        precioTotal
                    });
                    
                } catch (error) {
                    console.error('Error cálculo precio:', error);
                    await bot.sendMessage(remitente, { 
                        text: '❌ Error calculando el precio. Intenta nuevamente' 
                    });
                }
                break;
            }

            case ESTADOS_RESERVA.CONDICIONES: {
                const aceptado = /^s[iíí]$/i.test(mensajeTexto.trim());
                
                if (!aceptado) {
                    await bot.sendMessage(remitente, { 
                        text: '📝 Debes aceptar las condiciones para continuar\nResponde *"sí"* si estás de acuerdo' 
                    });
                    return;
                }
                
                const resumen = `
📋 *NUEVA SOLICITUD DE RESERVA*
--------------------------------
• 👤 *Nombre:* ${datos.nombre}
• 📱 *Teléfono:* ${datos.telefono}
• 👥 *Personas:* ${datos.personas}
• 🏠 *Alojamiento:* ${datos.alojamiento}
• 📅 *Fechas:* ${datos.fechaEntrada} - ${datos.fechaSalida} (${datos.noches} noches)
• 💰 *Total:* $${datos.precioTotal}
--------------------------------
                `;
                
                await enviarAlGrupo(bot, resumen);
                await enviarAlGrupo(bot, `/confirmar ${datos.telefono}`);
                await bot.sendMessage(remitente, { 
                    text: '📤 Reserva enviada para confirmación\n\n💳 *Por favor envía tu comprobante de pago:*' 
                });
                
                await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_PAGO, datos);
                break;
            }

            case ESTADOS_RESERVA.ESPERANDO_PAGO: {
                const esComprobante = mensaje.imageMessage || mensaje.documentMessage;
                
                if (!esComprobante) {
                    await bot.sendMessage(remitente, { 
                        text: '📎 Por favor envía una *foto* o *PDF* del comprobante' 
                    });
                    return;
                }
                
                await reenviarComprobanteAlGrupo(bot, mensaje, datos);
                await bot.sendMessage(remitente, { 
                    text: '✅ Comprobante recibido\n\n⏳ *Un administrador confirmará tu reserva pronto*' 
                });
                
                await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_CONFIRMACION, datos);
                break;
            }

            case ESTADOS_RESERVA.ESPERANDO_CONFIRMACION: {
                await bot.sendMessage(remitente, { 
                    text: '⏳ Tu reserva está en proceso de confirmación\nTe notificaremos cuando esté lista' 
                });
                break;
            }

            // Estado TELEFONO eliminado por redundancia
        }
    } catch (error) {
        console.error('Error en handleReservaState:', error);
        await bot.sendMessage(remitente, { 
            text: '⚠️ Ocurrió un error inesperado. Por favor intenta nuevamente' 
        });
        await establecerEstado(remitente, 'MENU_PRINCIPAL');
    }
}

module.exports = { handleReservaState };