const { addKeyword } = require('@bot-whatsapp/bot');

// Datos estructurados para fácil mantenimiento
const CONTACTOS = {
  oficina: {
    horario: "Horario De Oficina",
    whatsapp: "50499905880",
    llamadas: "99905880"
  },
  emergencias: [
    {
      whatsapp: "+50499222188",
      llamadas: "99222188"
    },
    {
      whatsapp: "+50499905880",
      llamadas: "96870847"
    }
  ],
  ubicacion: {
    texto: "Tela Atlantida",
    mapa: "https://tinyurl.com/VillasJulie"
  }
};

// Genera dinámicamente el texto de contactos
const formatContactos = () => {
  let texto = `📞 *${CONTACTOS.oficina.horario}:*\n`;
  texto += `WhatsApp: ${CONTACTOS.oficina.whatsapp}\n`;
  texto += `Llamadas: ${CONTACTOS.oficina.llamadas}\n\n`;

  CONTACTOS.emergencias.forEach((contacto, index) => {
    texto += `📞 *Atención 24/7 ${CONTACTOS.emergencias.length > 1 ? `(${index + 1})` : ''}:*\n`;
    texto += `WhatsApp: ${contacto.whatsapp}\n`;
    texto += `Llamadas: ${contacto.llamadas}\n\n`;
  });

  texto += `📍 *Ubicación:*\n${CONTACTOS.ubicacion.texto}\n`;
  texto += `(Maps: ${CONTACTOS.ubicacion.mapa})`;

  return texto;
};

const flowContactoRapido = addKeyword(
  ['5', 'contacto rápido', 'contacto rapido', 'contacto', 'rapido'],
  { sensitive: true }  // Hacer insensible a mayúsculas/minúsculas
).addAnswer(formatContactos());

module.exports = flowContactoRapido;