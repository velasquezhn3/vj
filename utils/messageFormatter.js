/**
 * 💬 FORMATEADOR DE MENSAJES
 * Funciones para formatear mensajes del bot de WhatsApp
 */

/**
 * Formatear menú principal del bot
 * @returns {string} Mensaje del menú principal
 */
function formatMainMenu() {
  return `🏖️ *¡Bienvenido a Villas Julie!*

🌟 *Opciones disponibles:*

1️⃣ 🏠 *Ver cabañas disponibles*
2️⃣ 📅 *Hacer una reserva*
3️⃣ 📋 *Ver mis reservas*
4️⃣ 💰 *Consultar precios*
5️⃣ 📍 *Ubicación y contacto*
6️⃣ ❓ *Ayuda*

📝 *Escribe el número de la opción que deseas*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 Horario de atención: 8:00 AM - 8:00 PM
📞 Emergencias: +506 8888-8888`;
}

/**
 * Formatear lista de cabañas disponibles
 * @param {Array} cabins - Array de cabañas
 * @param {Object} searchParams - Parámetros de búsqueda
 * @returns {string} Mensaje con lista de cabañas
 */
function formatCabinList(cabins, searchParams = {}) {
  if (!cabins || cabins.length === 0) {
    return `😔 *No hay cabañas disponibles*

Lo sentimos, no encontramos cabañas disponibles para:
📅 *Fechas:* ${searchParams.startDate || 'No especificadas'} - ${searchParams.endDate || 'No especificadas'}
👥 *Huéspedes:* ${searchParams.guests || 'No especificado'}

💡 *Sugerencias:*
• Intenta con otras fechas
• Reduce el número de huéspedes
• Contacta directamente para opciones especiales

📞 *Contáctanos:* +506 8888-8888`;
  }

  let message = `🏠 *Cabañas Disponibles*\n\n`;
  
  if (searchParams.startDate && searchParams.endDate) {
    const nights = calculateNights(searchParams.startDate, searchParams.endDate);
    message += `📅 *Fechas:* ${formatDate(searchParams.startDate)} - ${formatDate(searchParams.endDate)} (${nights} noches)\n`;
  }
  
  if (searchParams.guests) {
    message += `👥 *Huéspedes:* ${searchParams.guests} personas\n`;
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  cabins.forEach((cabin, index) => {
    message += `${index + 1}️⃣ *${cabin.name}*\n`;
    message += `🏷️ *Tipo:* ${cabin.type_name || 'Estándar'}\n`;
    message += `👥 *Capacidad:* ${cabin.capacity} personas\n`;
    message += `💰 *Precio:* ₡${cabin.price_per_night?.toLocaleString() || 'Consultar'} por noche\n`;
    
    if (cabin.description) {
      message += `📝 *Descripción:* ${cabin.description}\n`;
    }
    
    if (cabin.amenities && cabin.amenities.length > 0) {
      message += `✨ *Amenidades:* ${cabin.amenities.slice(0, 3).join(', ')}${cabin.amenities.length > 3 ? '...' : ''}\n`;
    }
    
    if (searchParams.startDate && searchParams.endDate) {
      const totalPrice = cabin.price_per_night * (cabin.availability?.nights || 1);
      message += `💵 *Total estimado:* ₡${totalPrice.toLocaleString()}\n`;
    }
    
    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  });

  message += `📝 *Para reservar, escribe:*\n`;
  message += `"Reservar [número de cabaña]"\n`;
  message += `Ejemplo: "Reservar 1"\n\n`;
  message += `❓ *¿Necesitas más información?*\n`;
  message += `Escribe "Info [número de cabaña]" para más detalles`;

  return message;
}

/**
 * Formatear confirmación de reserva
 * @param {Object} reservation - Datos de la reserva
 * @returns {string} Mensaje de confirmación
 */
function formatConfirmation(reservation) {
  const {
    reservation_code,
    cabin_name,
    dates,
    guests,
    guest_name,
    pricing,
    status
  } = reservation;

  let message = `✅ *Reserva ${status === 'confirmed' ? 'Confirmada' : 'Pendiente'}*\n\n`;

  message += `🔖 *Código:* ${reservation_code}\n`;
  message += `🏠 *Cabaña:* ${cabin_name}\n`;
  message += `📅 *Fechas:* ${formatDate(dates.start_date)} - ${formatDate(dates.end_date)}\n`;
  message += `🌙 *Noches:* ${dates.nights}\n`;
  message += `👥 *Huéspedes:* ${guests} personas\n`;
  
  if (guest_name) {
    message += `🙋‍♂️ *Titular:* ${guest_name}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *RESUMEN DE COSTOS*\n\n`;

  if (pricing && pricing.breakdown) {
    Object.entries(pricing.breakdown).forEach(([concept, amount]) => {
      message += `• ${concept}: ${amount}\n`;
    });
  } else if (pricing && pricing.total) {
    message += `💵 *Total:* ₡${pricing.total.toLocaleString()}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (status === 'pending') {
    message += `⏰ *IMPORTANTE:*\n`;
    message += `• Esta reserva está PENDIENTE de confirmación\n`;
    message += `• Tienes 24 horas para confirmar\n`;
    message += `• Realiza el pago y envía el comprobante\n\n`;
    
    message += `💳 *MÉTODOS DE PAGO:*\n`;
    message += `• Transferencia SINPE Móvil\n`;
    message += `• Depósito bancario\n`;
    message += `• Tarjeta de crédito/débito\n\n`;
    
    message += `📞 *Para confirmar:*\n`;
    message += `Contacta +506 8888-8888`;
  } else {
    message += `🎉 *¡Reserva confirmada!*\n`;
    message += `• Tu reserva está garantizada\n`;
    message += `• Recibirás más detalles por email\n`;
    message += `• Guarda este código: ${reservation_code}\n\n`;
    
    message += `📝 *PRÓXIMOS PASOS:*\n`;
    message += `• Revisa tu email para detalles\n`;
    message += `• Llega entre 3:00 PM - 6:00 PM\n`;
    message += `• Presenta tu código de reserva\n\n`;
    
    message += `📞 *¿Preguntas?* +506 8888-8888`;
  }

  return message;
}

/**
 * Formatear mensaje de error
 * @param {string} errorType - Tipo de error
 * @param {string} details - Detalles del error
 * @returns {string} Mensaje de error formateado
 */
function formatError(errorType, details = '') {
  const errorMessages = {
    'invalid_date': `📅 *Error en fechas*\n\nPor favor, verifica que:\n• Las fechas estén en formato DD/MM/YYYY\n• La fecha de entrada sea anterior a la salida\n• Las fechas sean futuras\n\nEjemplo: "15/08/2025 al 17/08/2025"`,
    'no_availability': `😔 *Sin disponibilidad*\n\nNo hay cabañas disponibles para las fechas seleccionadas.\n\n💡 *Sugerencias:*\n• Intenta otras fechas\n• Reduce el número de huéspedes\n• Contacta directamente: +506 8888-8888`,
    'invalid_guests': `👥 *Error en número de huéspedes*\n\nPor favor, especifica un número válido de huéspedes (1-20).\n\nEjemplo: "2 personas" o "familia de 4"`,
    'cabin_not_found': `🏠 *Cabaña no encontrada*\n\nLa cabaña especificada no existe o no está disponible.\n\nEscribe "Ver cabañas" para ver las opciones disponibles.`,
    'reservation_not_found': `📋 *Reserva no encontrada*\n\nNo se encontró la reserva con el código proporcionado.\n\nVerifica el código o contacta: +506 8888-8888`,
    'system_error': `⚠️ *Error del sistema*\n\nOcurrió un error temporal. Por favor:\n• Intenta nuevamente en unos minutos\n• Si persiste, contacta: +506 8888-8888`
  };

  let message = errorMessages[errorType] || errorMessages['system_error'];
  
  if (details) {
    message += `\n\n📋 *Detalles:* ${details}`;
  }

  message += `\n\n🔄 *Para volver al menú principal, escribe "Menú"*`;

  return message;
}

/**
 * Formatear información de contacto y ubicación
 * @returns {string} Mensaje con información de contacto
 */
function formatContactInfo() {
  return `📍 *Villas Julie - Información de Contacto*

🏖️ *Ubicación:*
Playa Hermosa, Guanacaste
Costa Rica

📞 *Teléfonos:*
• Principal: +506 8888-8888
• WhatsApp: +506 8888-8888
• Emergencias: +506 7777-7777

📧 *Email:*
info@villasjulie.com

🕒 *Horarios:*
• Check-in: 3:00 PM - 6:00 PM
• Check-out: 11:00 AM
• Recepción: 8:00 AM - 8:00 PM

🚗 *Cómo llegar:*
• 2 horas desde San José
• 45 min desde Aeropuerto Liberia
• Transporte disponible (costo adicional)

🌐 *Redes sociales:*
• Facebook: @VillasJulieCR
• Instagram: @villasjulie
• Web: www.villasjulie.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏖️ *¡Te esperamos en el paraíso!*`;
}

/**
 * Formatear ayuda del bot
 * @returns {string} Mensaje de ayuda
 */
function formatHelp() {
  return `❓ *Ayuda - Cómo usar el bot*

🤖 *Comandos principales:*
• "Menú" - Mostrar menú principal
• "Cabañas" - Ver cabañas disponibles  
• "Reservar" - Hacer una reserva
• "Mis reservas" - Ver tus reservas
• "Precios" - Consultar tarifas
• "Ubicación" - Información de contacto

📅 *Para hacer una reserva:*
1. Escribe las fechas: "15/08/2025 al 17/08/2025"
2. Indica huéspedes: "para 4 personas"
3. Selecciona cabaña de la lista
4. Confirma los detalles

💡 *Ejemplos de mensajes:*
• "Cabañas disponibles del 15/08 al 17/08"
• "Reservar cabaña 2 para 4 personas"
• "¿Cuánto cuesta la cabaña familiar?"
• "Cancelar reserva VJ123456ABC"

🆘 *¿Necesitas ayuda humana?*
📞 Llama a +506 8888-8888
📧 Email: info@villasjulie.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ *Estamos aquí para ayudarte 24/7*`;
}

/**
 * Formatear fecha en español
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/Costa_Rica'
    };
    return date.toLocaleDateString('es-CR', options);
  } catch (error) {
    return dateString;
  }
}

/**
 * Calcular noches entre fechas
 * @param {string} startDate - Fecha inicio
 * @param {string} endDate - Fecha fin
 * @returns {number} Número de noches
 */
function calculateNights(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 1;
  }
}

/**
 * Formatear precio en colones
 * @param {number} amount - Cantidad
 * @returns {string} Precio formateado
 */
function formatPrice(amount) {
  try {
    return `₡${amount.toLocaleString('es-CR')}`;
  } catch (error) {
    return `₡${amount}`;
  }
}

module.exports = {
  formatMainMenu,
  formatCabinList,
  formatConfirmation,
  formatError,
  formatContactInfo,
  formatHelp,
  formatDate,
  formatPrice,
  calculateNights
};
