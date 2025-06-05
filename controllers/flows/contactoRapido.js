/**
 * Flujo para manejar la sección de Contacto Rápido.
 */

const { addKeyword, addAnswer } = require('@bot-whatsapp/bot');

const flowContactoRapido = addKeyword(['5', 'contacto rápido', 'contacto rapido'])
  .addAnswer(
    `📞 *Horario De Oficina:*  
WhatsApp: 50499905880  
Llamadas: 99905880

📞 *Atención 24/7:*  
WhatsApp: +50499222188  
Llamadas: 99222188

📞 *Atención 24/7:*  
WhatsApp: +50499905880  
Llamadas: 96870847

📍 *Ubicación:*  
Tela Atlantida
(Maps: [ https://tinyurl.com/VillasJulie ])`
  );

module.exports = flowContactoRapido;
