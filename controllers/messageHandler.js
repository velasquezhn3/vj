/**
 * Módulo para el procesamiento de mensajes y flujo de conversación del bot con manejo mejorado de errores.
 */

const { establecerEstado, obtenerEstado, establecerUltimoSaludo, obtenerUltimoSaludo } = require('../services/stateService');
const weatherService = require('../services/weatherService');
const { isValidDate, confirmarReserva } = require('../utils/utils');
const constants = require('./constants');
const { flowAlojamientos } = require('./flows/alojamientos');

/**
 * Envía el menú principal al usuario.
 * @param {Object} bot - Instancia del bot.
 * @param {string} remitente - Número del usuario.
 */
async function enviarMenuPrincipal(bot, remitente) {
  try {
    await establecerEstado(remitente, 'main');
    await bot.sendMessage(remitente, { text: constants.MENU_PRINCIPAL });
  } catch (error) {
    console.error('Error enviando menú principal:', error);
  }
}

/**
 * Procesa los mensajes recibidos y maneja la lógica de conversación con manejo de errores.
 * @param {Object} bot - Instancia del bot.
 * @param {string} remitente - Número del usuario.
 * @param {string} mensaje - Texto del mensaje recibido.
 */
async function procesarMensaje(bot, remitente, mensaje, mensajeObj) {
  const estado = obtenerEstado(remitente);
  const textoMinuscula = mensaje.toLowerCase();

  // Check if greeting was sent today
  const hoy = new Date().toISOString().slice(0, 10);
  const ultimoSaludo = obtenerUltimoSaludo(remitente);
  let esPrimerMensajeDelDia = false;

  if (ultimoSaludo !== hoy) {
    esPrimerMensajeDelDia = true;
    await establecerUltimoSaludo(remitente, hoy);
    const saludo = `🌴 ¡Bienvenido(a) a Villas Yulie! 🏖️ .Tu rincón ideal frente al mar te espera.`;
    try {
      await bot.sendMessage(remitente, { text: saludo });
    } catch (error) {
      console.error('Error enviando saludo:', error);
    }
    // Set state to MENU_PRINCIPAL after greeting
    await establecerEstado(remitente, 'MENU_PRINCIPAL');
    try {
      await enviarMenuPrincipal(bot, remitente);
    } catch (error) {
      console.error('Error enviando menú principal:', error);
    }
    return;
  }

  if (textoMinuscula === 'menu' || textoMinuscula === 'menú') {
    try {
      await enviarMenuPrincipal(bot, remitente);
    } catch (error) {
      console.error('Error enviando menú principal:', error);
    }
    return;
  }

  // Special keyword responses
  if (textoMinuscula.includes('aniversario') || textoMinuscula.includes('luna de miel')) {
    try {
      await bot.sendMessage(remitente, {
        text: `💖 *Paquete Romántico Especial*:\nIncluye cena gourmet, decoración y champán!\nPrecio especial: $200/noche`
      });
    } catch (error) {
      console.error('Error enviando paquete romántico:', error);
    }
    return;
  }

  if (textoMinuscula.includes('eco') || textoMinuscula.includes('sostenible')) {
    try {
      await bot.sendMessage(remitente, {
        text: `🌱 *Modo Eco Activado*:\nMostrando cabañas con paneles solares y reciclaje...`
      });
    } catch (error) {
      console.error('Error enviando modo eco:', error);
    }
    return;
  }

  if (textoMinuscula.includes('clima') || textoMinuscula.includes('tiempo')) {
    try {
      const clima = await weatherService.getClima();
      await bot.sendMessage(remitente, { text: clima });
    } catch (error) {
      console.error('Error enviando clima:', error);
    }
    return;
  }

  switch (estado.estado) {
    case 'main':
      switch (mensaje) {
        case '1':
          try {
            const cabañas = require('./cabañas.json');
            if (cabañas.length === 0) {
              await bot.sendMessage(remitente, { text: '⚠️ No hay cabañas disponibles en este momento.' });
              break;
            }
            let menu = 'Tenemos estas cabañas disponibles:\n';
            cabañas.forEach((cabaña, index) => {
              menu += `${index + 1}. ${cabaña.nombre}\n`;
            });
            menu += 'Por favor, selecciona el número de la cabaña para ver más detalles.';
            await bot.sendMessage(remitente, { text: menu });
            await establecerEstado(remitente, 'alojamientos');
          } catch (error) {
            console.error('Error enviando menú dinámico de alojamientos:', error);
          }
          break;
        case '2':
          try {
            await bot.sendMessage(remitente, {
              text: `📅 *Reservar Ahora*:\nPor favor, indique el tipo de alojamiento que desea reservar.`
            });
            await establecerEstado(remitente, 'reservar');
          } catch (error) {
            console.error('Error enviando reservar ahora:', error);
          }
          break;
        case '3':
          try {
            await bot.sendMessage(remitente, {
              text: `📲 *Contacto Rápido*:\nPuede contactarnos al +123456789 o por email a contacto@example.com`
            });
          } catch (error) {
            console.error('Error enviando contacto rápido:', error);
          }
          break;
        case '4':
          try {
            await bot.sendMessage(remitente, {
              text: `📞 *Atención 24/7:*  \n` +
                    `WhatsApp: http://wa.me/50499222188  \n` +
                    `Llamadas: 50499222188  \n\n` +
                    `📞 *Atención 24/7:*  \n` +
                    `WhatsApp: http://wa.me/50499905880  \n` +
                    `Llamadas: 50499905880  \n\n` +
                    `📍 *Ubicación:*  \n` +
                    `Carretera Bosque 123, Valle Bravo (Maps: [bit.ly/UbicCabañas])`
            });
          } catch (error) {
            console.error('Error enviando contacto rápido actualizado:', error);
          }
          break;
        case '5':
          try {
            await bot.sendMessage(remitente, {
              text: `❓ *Preguntas Frecuentes – Villas frente al mar*\n\n` +
                    `1. 🏡 ¿Qué tipos de alojamientos ofrecen?\n` +
                    `Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños.\n\n` +
                    `2. 🕒 ¿A qué hora es el check-in y check-out?\n` +
                    `Check-in: A partir de las 2:00 PM\n` +
                    `Check-out: Hasta las 11:00 AM\n\n` +
                    `3. 💵 ¿Cuáles son las tarifas por noche?\n` +
                    `Las tarifas varían según la temporada, tipo de alojamiento y número de personas. Contáctanos con las fechas exactas para enviarte una cotización personalizada.\n\n` +
                    `4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?\n` +
                    `Niños: ¡Bienvenidos!\n` +
                    `Mascotas: Permitidas en algunas cabañas bajo ciertas condiciones. Por favor consulta antes de reservar.\n\n` +
                    `5. 🍳 ¿Las cabañas tienen cocina?\n` +
                    `Sí, nuestras cabañas y apartamentos cuentan con cocina equipada (refrigeradora, estufa, utensilios básicos).\n\n` +
                    `6. 🏖️ ¿Qué servicios están incluidos?\n` +
                    `Aire acondicionado\n` +
                    `Wi-Fi\n` +
                    `Parqueo privado\n` +
                    `Acceso directo a la playa\n` +
                    `Áreas de descanso y hamacas\n` +
                    `Piscina (si aplica)\n\n` +
                    `7. 📍 ¿Dónde están ubicados?\n` +
                    `Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila, ideal para descansar.\n\n` +
                    `8. 📅 ¿Cómo puedo reservar?\n` +
                    `Puedes escribirnos directamente por WhatsApp, indicándonos:\n` +
                    `Fechas de entrada y salida\n` +
                    `Número de personas\n` +
                    `Si viajas con niños o mascotas\n` +
                    `Te confirmaremos disponibilidad y precio.\n\n` +
                    `9. 💳 ¿Qué formas de pago aceptan?\n` +
                    `Aceptamos:\n` +
                    `Efectivo\n` +
                    `Transferencias bancarias\n` +
                    `Tarjeta de credito/debito\n\n` +
                    `10. 🔒 ¿Se requiere depósito para reservar?\n` +
                    `Sí, para garantizar tu reserva solicitamos un adelanto del 50% del total. El resto se paga al llegar.`
            });
          } catch (error) {
            console.error('Error enviando preguntas frecuentes:', error);
          }
          break;
        case '6':
          try {
            await bot.sendMessage(remitente, {
              text: `🏝️ *Preguntas Frecuentes – Villas frente al mar*\n\n` +
                    `1. 🏡 ¿Qué tipos de alojamientos ofrecen?\n` +
                    `Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños.\n\n` +
                    `2. 🕒 ¿A qué hora es el check-in y check-out?\n` +
                    `Check-in: A partir de las 2:00 PM\n` +
                    `Check-out: Hasta las 11:00 AM\n\n` +
                    `3. 💵 ¿Cuáles son las tarifas por noche?\n` +
                    `Las tarifas varían según la temporada, tipo de alojamiento y número de personas. Contáctanos con las fechas exactas para enviarte una cotización personalizada.\n\n` +
                    `4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?\n` +
                    `Niños: ¡Bienvenidos!\n` +
                    `Mascotas: Permitidas en algunas cabañas bajo ciertas condiciones. Por favor consulta antes de reservar.\n\n` +
                    `5. 🍳 ¿Las cabañas tienen cocina?\n` +
                    `Sí, nuestras cabañas y apartamentos cuentan con cocina equipada (refrigeradora, estufa, utensilios básicos).\n\n` +
                    `6. 🏖️ ¿Qué servicios están incluidos?\n` +
                    `Aire acondicionado\n` +
                    `Wi-Fi\n` +
                    `Parqueo privado\n` +
                    `Acceso directo a la playa\n` +
                    `Áreas de descanso y hamacas\n` +
                    `Piscina (si aplica)\n\n` +
                    `7. 📍 ¿Dónde están ubicados?\n` +
                    `Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila, ideal para descansar.\n\n` +
                    `8. 📅 ¿Cómo puedo reservar?\n` +
                    `Puedes escribirnos directamente por WhatsApp, indicándonos:\n` +
                    `Fechas de entrada y salida\n` +
                    `Número de personas\n` +
                    `Si viajas con niños o mascotas\n` +
                    `Te confirmaremos disponibilidad y precio.\n\n` +
                    `9. 💳 ¿Qué formas de pago aceptan?\n` +
                    `Aceptamos:\n` +
                    `Efectivo\n` +
                    `Transferencias bancarias\n` +
                    `Tarjeta de credito/debito\n\n` +
                    `10. 🔒 ¿Se requiere depósito para reservar?\n` +
                    `Sí, para garantizar tu reserva solicitamos un adelanto del 50% del total. El resto se paga al llegar.\n\n` +
                    `Escribe "menu" para volver al menú principal.`
            });
          } catch (error) {
            console.error('Error enviando preguntas frecuentes mejoradas:', error);
          }
          break;
        case '7':
          try {
            await bot.sendMessage(remitente, {
              text: `🛎️ *Ayuda Post-Reserva*:\n¿En qué podemos ayudarte después de tu reserva?`
            });
          } catch (error) {
            console.error('Error enviando ayuda post-reserva:', error);
          }
          break;
        case '8':
          try {
            await bot.sendMessage(remitente, {
              text: `💎 *Programa Fidelidad*:\nAcumule puntos y obtenga descuentos exclusivos.`
            });
          } catch (error) {
            console.error('Error enviando programa fidelidad:', error);
          }
          break;
        default:
          try {
            await bot.sendMessage(remitente, { text: 'Opción no válida. Por favor seleccione una opción del menú.' });
            await enviarMenuPrincipal(bot, remitente);
          } catch (error) {
            console.error('Error enviando opción no válida:', error);
          }
          break;
      }
      break;

    case 'alojamientos':
      try {
        const cabañas = require('./cabañas.json');
        const seleccion = parseInt(mensaje.trim());
        if (isNaN(seleccion) || seleccion < 1 || seleccion > cabañas.length) {
          await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.' });
          break;
        }
        const cabaña = cabañas[seleccion - 1];
        let detalles = `🏖️ *${cabaña.nombre}* (${cabaña.tipo})\n`;
        detalles += `👥 Capacidad: ${cabaña.capacidad} personas\n`;
        detalles += `🛏️ Habitaciones: ${cabaña.habitaciones} | 🚿 Baños: ${cabaña.baños}\n`;
        detalles += `💰 Precio por noche: ${cabaña.precio_noche.toLocaleString()} ${cabaña.moneda}\n`;
        detalles += `📍 Ubicación: ${cabaña.ubicacion.ciudad}, ${cabaña.ubicacion.departamento}\n\n`;
        detalles += `🛋️ Comodidades:\n`;
        cabaña.comodidades.forEach(item => {
          detalles += `- ${item}\n`;
        });
        if (cabaña.reservas && cabaña.reservas.length > 0) {
          detalles += `\n📅 Fechas reservadas:\n`;
          cabaña.reservas.forEach(reserva => {
            detalles += `- ${reserva.fecha_inicio} a ${reserva.fecha_fin} (${reserva.estado})\n`;
          });
        }
        // Send first photo as image with caption
        if (cabaña.fotos && cabaña.fotos.length > 0) {
          await bot.sendMessage(remitente, {
            image: { url: cabaña.fotos[0] },
            caption: detalles
          });
          // Send remaining photos as separate image messages
          for (let i = 1; i < cabaña.fotos.length; i++) {
            await bot.sendMessage(remitente, {
              image: { url: cabaña.fotos[i] }
            });
          }
        } else {
          // If no photos, send text only
          await bot.sendMessage(remitente, { text: detalles });
        }
      } catch (error) {
        console.error('Error enviando detalles de cabaña:', error);
      }
      break;

    case 'reservar':
      if (!estado.tempReserva) estado.tempReserva = {};

      if (!estado.tempReserva.tipo) {
        estado.tempReserva.tipo = mensaje;
        try {
          await bot.sendMessage(remitente, {
            text: '📅 Ingresa fechas (Formato: DD/MM - DD/MM)\nEj: 25/12 - 30/12'
          });
          await establecerEstado(remitente, 'reserva_paso2', estado.tempReserva);
        } catch (error) {
          console.error('Error enviando solicitud de fechas:', error);
        }
      }
      break;

    case 'reserva_paso2':
      if (isValidDate(mensaje)) {
        if (!estado.tempReserva) estado.tempReserva = {};
        estado.tempReserva.fechaInicio = mensaje.split('-')[0].trim();
        estado.tempReserva.fechaFin = mensaje.split('-')[1].trim();
        try {
          await bot.sendMessage(remitente, {
            text: '👥 ¿Cuántas personas serán?'
          });
          await establecerEstado(remitente, 'reserva_paso3', estado.tempReserva);
        } catch (error) {
          console.error('Error enviando solicitud de número de personas:', error);
        }
      } else {
        try {
          await bot.sendMessage(remitente, { text: 'Formato de fecha no válido. Por favor, intente de nuevo.' });
        } catch (error) {
          console.error('Error enviando mensaje de formato de fecha inválido:', error);
        }
      }
      break;

    case 'reserva_paso3':
      if (!isNaN(Number(mensaje))) {
        estado.tempReserva.personas = Number(mensaje);
        try {
          await confirmarReserva(remitente, estado.tempReserva);
          await establecerEstado(remitente, 'main');
        } catch (error) {
          console.error('Error confirmando reserva:', error);
        }
      } else {
        try {
          await bot.sendMessage(remitente, { text: 'Número no válido. Por favor, ingrese un número.' });
        } catch (error) {
          console.error('Error enviando mensaje de número inválido:', error);
        }
      }
      break;

    case 'MENU_PRINCIPAL':
      switch (mensaje) {
        case '1':
          try {
            await bot.sendMessage(remitente, { text: 'Por favor, envíe su información para validar.' });
            await establecerEstado(remitente, 'VALIDACION_USUARIO');
          } catch (error) {
            console.error('Error enviando solicitud de validación de usuario:', error);
          }
          break;
        case '2':
          try {
            await bot.sendMessage(remitente, { text: 'Opción de validación alternativa seleccionada.' });
            await establecerEstado(remitente, 'VALIDACION_ALTERNATIVA');
          } catch (error) {
            console.error('Error enviando opción de validación alternativa:', error);
          }
          break;
        case '3':
          try {
            await bot.sendMessage(remitente, { text: '🌴 ¡Bienvenido(a) a Villas Yulie! 🏖️ .Tu rincón ideal frente al mar te espera.' });
            await establecerEstado(remitente, 'FIN');
          } catch (error) {
            console.error('Error enviando mensaje de despedida:', error);
          }
          break;
        default:
          if (!esPrimerMensajeDelDia) {
            try {
              await bot.sendMessage(remitente, { text: 'Opción no válida. Por favor seleccione una opción del menú.' });
            } catch (error) {
              console.error('Error enviando opción no válida en menú principal:', error);
            }
          }
          try {
            await enviarMenuPrincipal(bot, remitente);
          } catch (error) {
            console.error('Error enviando menú principal:', error);
          }
          break;
      }
      break;
    // Additional states for validation can be added here
    default:
      try {
        await enviarMenuPrincipal(bot, remitente);
      } catch (error) {
        console.error('Error enviando menú principal en estado por defecto:', error);
      }
      break;
  }
}

module.exports = {
  enviarMenuPrincipal,
  procesarMensaje
};
