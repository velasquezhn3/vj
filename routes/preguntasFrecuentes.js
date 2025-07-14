const { addKeyword } = require('@bot-whatsapp/bot');

// Estructura de datos para preguntas frecuentes
const FAQS = [
  {
    id: 1,
    icon: "🏡",
    question: "¿Qué tipos de alojamientos ofrecen?",
    answer: "Ofrecemos cabañas y apartamentos equipados, con vista al mar y acceso directo a la playa. Contamos con opciones para parejas, familias o grupos pequeños."
  },
  {
    id: 2,
    icon: "🕒",
    question: "¿A qué hora es el check-in y check-out?",
    answer: "• Check-in: A partir de las 2:00 PM\n• Check-out: Hasta las 11:00 AM"
  },
  {
    id: 3,
    icon: "💵",
    question: "¿Cuáles son las tarifas por noche?",
    answer: "Las tarifas varían según:\n- Temporada\n- Tipo de alojamiento\n- Número de personas\n\nContáctanos con tus fechas para una cotización personalizada."
  },
  {
    id: 4,
    icon: "👨‍👩‍👧",
    question: "¿Se permiten niños y mascotas?",
    answer: "• Niños: ¡Bienvenidos!\n• Mascotas: Permitidas en algunas cabañas bajo condiciones específicas. Consulta antes de reservar."
  },
  {
    id: 5,
    icon: "🍳",
    question: "¿Las cabañas tienen cocina?",
    answer: "Sí, todas incluyen cocina equipada con:\n- Refrigeradora\n- Estufa\n- Utensilios básicos"
  },
  {
    id: 6,
    icon: "🏖️",
    question: "¿Qué servicios están incluidos?",
    answer: "• Aire acondicionado\n• Wi-Fi\n• Parqueo privado\n• Acceso directo a playa\n• Áreas de descanso con hamacas\n• Piscina (en unidades seleccionadas)"
  },
  {
    id: 7,
    icon: "📍",
    question: "¿Dónde están ubicados?",
    answer: "Estamos en Tela, Atlántida, justo frente al mar, en una zona segura y tranquila.\n\n📍 Ubicación: [Ver en Maps](https://tinyurl.com/VillasJulie)"
  },
  {
    id: 8,
    icon: "📅",
    question: "¿Cómo puedo reservar?",
    answer: "Escríbenos por WhatsApp indicando:\n- Fechas de entrada/salida\n- Número de personas\n- Si viajas con niños/mascotas\n\nTe confirmaremos disponibilidad y precio."
  },
  {
    id: 9,
    icon: "💳",
    question: "¿Qué formas de pago aceptan?",
    answer: "Aceptamos:\n- Efectivo (HNL)\n- Transferencias bancarias\n- Pago móvil (Tigo Money, etc.)"
  },
  {
    id: 10,
    icon: "🔒",
    question: "¿Se requiere depósito para reservar?",
    answer: "Sí, requerimos:\n• 50% de adelanto para garantizar la reserva\n• 50% restante al llegar"
  }
];

// Generar mensaje de FAQ con formato mejorado
const generateFAQMessage = () => {
  let message = "🏝️ *PREGUNTAS FRECUENTES - Villas Julie*\n\n";
  
  FAQS.forEach(faq => {
    message += `${faq.id}. ${faq.icon} *${faq.question}*\n${faq.answer}\n\n`;
  });
  
  message += "💬 ¿Necesitas más información? Escribe tu pregunta o selecciona un número.";
  
  return message;
};

const flowPreguntasFrecuentes = addKeyword(
  ['8', 'preguntas frecuentes', 'faq', 'preguntas', 'frecuentes', 'dudas'],
  { sensitive: true } // Insensible a mayúsculas/minúsculas
).addAnswer(generateFAQMessage());

module.exports = flowPreguntasFrecuentes;