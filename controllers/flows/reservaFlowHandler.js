const { establecerEstado } = require('../../services/stateService');
const { calcularPrecioTotal } = require('../../services/reservaPriceService');
const { enviarAlGrupo, reenviarComprobanteAlGrupo } = require('../../utils/utils');
const { ESTADOS_RESERVA } = require('../reservaConstants');
const usersService = require('../../services/usersService');

async function handleReservaState(bot, remitente, mensajeTexto, estado, datos, mensaje) {
    switch (estado) {
        case ESTADOS_RESERVA.FECHAS: {
            const partes = mensajeTexto.split('-');
            if (partes.length !== 2) {
                await bot.sendMessage(remitente, { text: 'Por favor, usa el formato correcto: 20/08/2025 - 25/08/2025' });
                return;
            }
            const fechaEntradaStr = partes[0].trim();
            const fechaSalidaStr = partes[1].trim();

            const [diaE, mesE, anioE] = fechaEntradaStr.split('/');
            const [diaS, mesS, anioS] = fechaSalidaStr.split('/');
            const fechaEntradaDate = new Date(anioE, mesE - 1, diaE);
            const fechaSalidaDate = new Date(anioS, mesS - 1, diaS);
            const diffTime = fechaSalidaDate - fechaEntradaDate;
            const noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (noches < 1) {
                await bot.sendMessage(remitente, { text: 'La fecha de salida debe ser posterior a la fecha de entrada. Por favor, ingresa las fechas nuevamente.' });
                return;
            }

            const disponible = true; // Cambiar por función real si se desea
            if (disponible) {
                await bot.sendMessage(remitente, { text: '✅ ¡Fechas disponibles! Continuemos...\nPor favor, dime tu nombre completo:' });
                await establecerEstado(remitente, ESTADOS_RESERVA.NOMBRE, { fechaEntrada: fechaEntradaStr, fechaSalida: fechaSalidaStr, noches });
            } else {
                await bot.sendMessage(remitente, { text: '❌ Lo sentimos, esas fechas no están disponibles. ¿Deseas intentar con otras?' });
            }
            break;
        }

        case ESTADOS_RESERVA.NOMBRE: {
            await bot.sendMessage(remitente, { text: '¿Cuál es tu número de teléfono?' });
            await establecerEstado(remitente, ESTADOS_RESERVA.TELEFONO, { ...datos, nombre: mensajeTexto });
            break;
        }

        case ESTADOS_RESERVA.TELEFONO: {
            await bot.sendMessage(remitente, { text: '¿Cuántas personas serán?' });
            await establecerEstado(remitente, ESTADOS_RESERVA.PERSONAS, { ...datos, telefono: mensajeTexto });
            break;
        }

        case ESTADOS_RESERVA.PERSONAS: {
            const cantidad = parseInt(mensajeTexto.trim());

            if (isNaN(cantidad) || cantidad < 1) {
                await bot.sendMessage(remitente, { text: 'Por favor, ingresa una cantidad válida de personas (número mayor a 0).' });
                return;
            }

            let alojamiento = '';
            if (cantidad <= 3) {
                alojamiento = 'Cabaña Tortuga';
            } else if (cantidad <= 6) {
                alojamiento = 'Cabaña Caracol';
            } else if (cantidad <= 9) {
                alojamiento = 'Cabaña Tiburón';
            } else {
                await bot.sendMessage(remitente, {
                    text: `La cantidad ingresada (${cantidad}) excede la capacidad máxima por cabaña (9 personas). Te sugerimos alquilar más de una cabaña.`
                });
                return;
            }

            await bot.sendMessage(remitente, {
                text: `Perfecto. Se asignó automáticamente *${alojamiento}* para ${cantidad} persona(s).`
            });

            const noches = datos.noches;
            if (!noches) {
                await bot.sendMessage(remitente, { text: 'Error: no se encontró el número de noches. Por favor, reinicia la reserva.' });
                await establecerEstado(remitente, 'MENU_PRINCIPAL');
                return;
            }

            // Agregar log para depuración
            console.log(`Calcular precio total: alojamiento=${alojamiento}, fechaEntrada=${datos.fechaEntrada}, noches=${noches}`);

            const precioTotal = calcularPrecioTotal(alojamiento, datos.fechaEntrada, noches);
            console.log(`Precio total calculado: ${precioTotal}`);

            await bot.sendMessage(remitente, { text: `El precio total para tu reserva es: $${precioTotal}` });
            await bot.sendMessage(remitente, { text: '¿Leíste y aceptas las condiciones de uso? (responde sí/no)' });
            await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, {
                ...datos,
                personas: cantidad,
                alojamiento,
                noches,
                precioTotal
            });
            break;
        }

        case ESTADOS_RESERVA.ALOJAMIENTO: {
            await bot.sendMessage(remitente, { text: '¿Leíste y aceptas las condiciones de uso? (responde sí/no)' });
            await establecerEstado(remitente, ESTADOS_RESERVA.CONDICIONES, { ...datos, alojamiento: mensajeTexto });
            break;
        }

        case ESTADOS_RESERVA.CONDICIONES: {
            if (mensajeTexto.toLowerCase() === 'sí' || mensajeTexto.toLowerCase() === 'si') {
                const resumen =
`/confirmar
Nombre: ${datos.nombre}
Teléfono: ${datos.telefono}
Personas: ${datos.personas}
Alojamiento: ${datos.alojamiento}
Fechas: ${datos.fechaEntrada} - ${datos.fechaSalida}
Noches: ${datos.noches}
Total a pagar: $${datos.precioTotal}`;

                await enviarAlGrupo(bot, resumen);

                // Save reservation to DB
                console.log('Intentando obtener usuario por teléfono:', datos.telefono);
                let user = await usersService.getUserByPhone(datos.telefono);
                console.log('Usuario obtenido:', user);
                if (!user) {
                  console.log('Usuario no encontrado, creando nuevo usuario...');
                  const userId = await usersService.createUser({ phone_number: datos.telefono, name: datos.nombre });
                  console.log('Nuevo usuario creado con ID:', userId);
                  user = { user_id: userId, phone_number: datos.telefono, name: datos.nombre };
                }
                const userId = user.user_id;
                console.log('Usando userId para reserva:', userId, 'Tipo:', typeof userId);

                const cabinIdMap = {
                  'Cabaña Tortuga': 1,
                  'Cabaña Caracol': 2,
                  'Cabaña Tiburón': 3
                };
                const cabinId = cabinIdMap[datos.alojamiento] || 1;

                const reservaData = {
                  start_date: datos.fechaEntrada,
                  end_date: datos.fechaSalida,
                  status: 'pendiente',
                  total_price: datos.precioTotal
                };

                const success = await require('../../services/alojamientosService').addReserva(cabinId, userId, reservaData);
                console.log('Resultado de guardar reserva:', success);
                if (success) {
                  await bot.sendMessage(remitente, { text: 'Tu reserva ha sido guardada correctamente. Para confirmar, debes hacer un depósito del 50%. Tienes 24h para enviar el comprobante.' });
                } else {
                  await bot.sendMessage(remitente, { text: 'Hubo un error guardando tu reserva. Por favor intenta nuevamente más tarde.' });
                }

                await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_PAGO, { ...datos, condiciones: mensajeTexto });
            } else {
                await bot.sendMessage(remitente, { text: 'Debes aceptar las condiciones para continuar.' });
            }
            break;
        }

        case ESTADOS_RESERVA.ESPERANDO_PAGO: {
            if (mensaje.imageMessage || mensaje.documentMessage) {
                await reenviarComprobanteAlGrupo(bot, mensaje, datos);
                await bot.sendMessage(remitente, { text: '¡Comprobante recibido! Un administrador confirmará tu reserva pronto.' });
                await establecerEstado(remitente, ESTADOS_RESERVA.ESPERANDO_CONFIRMACION, datos);
            } else {
                await bot.sendMessage(remitente, { text: 'Por favor, envía una foto o PDF del comprobante de pago.' });
            }
            break;
        }

        case ESTADOS_RESERVA.ESPERANDO_CONFIRMACION: {
            await bot.sendMessage(remitente, { text: 'Tu reserva está siendo confirmada. Por favor espera.' });
            break;
        }

        default:
            // Not handled here
            break;
    }
}

module.exports = {
    handleReservaState
};
