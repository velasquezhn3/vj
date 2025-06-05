/**
 * Flujo para manejar la sección de Preguntas Frecuentes.
 */

const { addKeyword, addAnswer } = require('@bot-whatsapp/bot');

const flowPreguntasFrecuentes = addKeyword(['8', 'preguntas frecuentes', 'faq'])
  .addAnswer(
    `A🏝️ Preguntas Frecuentes – Villas frente al mar
1. 🏡 ¿Qué tipos de alojamientos ofrecen?
Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños.

2. 🕒 ¿A qué hora es el check-in y check-out?
Check-in: A partir de las 2:00 PM
Check-out: Hasta las 11:00 AM

3. 💵 ¿Cuáles son las tarifas por noche?
Las tarifas varían según la temporada, tipo de alojamiento y número de personas. Contáctanos con las fechas exactas para enviarte una cotización personalizada.

4. 👨‍👩‍👧 ¿Se permiten niños y mascotas?
Niños: ¡Bienvenidos!
Mascotas: Permitidas en algunas cabañas bajo ciertas condiciones. Por favor consulta antes de reservar.

5. 🍳 ¿Las cabañas tienen cocina?
Sí, nuestras cabañas y apartamentos cuentan con cocina equipada (refrigeradora, estufa, utensilios básicos).

6. 🏖️ ¿Qué servicios están incluidos?
Aire acondicionado
Wi-Fi
Parqueo privado
Acceso directo a la playa
Áreas de descanso y hamacas
Piscina (si aplica)

7. 📍 ¿Dónde están ubicados?
Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila, ideal para descansar.

8. 📅 ¿Cómo puedo reservar?
Puedes escribirnos directamente por WhatsApp, indicándonos:
Fechas de entrada y salida
Número de personas
Si viajas con niños o mascotas
Te confirmaremos disponibilidad y precio.

9. 💳 ¿Qué formas de pago aceptan?
Aceptamos:
Efectivo
Transferencias bancarias
Pago por Tigo Money o similar

10. 🔒 ¿Se requiere depósito para reservar?
Sí, para garantizar tu reserva solicitamos un adelanto del 50% del total. El resto se paga al llegar.`
  );

module.exports = flowPreguntasFrecuentes;
