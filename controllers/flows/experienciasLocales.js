const fs = require('fs');
const path = require('path');
const { addKeyword } = require('@bot-whatsapp/bot');

const ACTIVIDADES_PATH = path.join(__dirname, 'actividades.json');

const loadActividades = () => {
  try {
    const data = fs.readFileSync(ACTIVIDADES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading actividades.json:', e);
    return [];
  }
};

async function handleExperienciasLocales(bot, remitente, mensaje, establecerEstado) {
  const actividades = loadActividades();
  if (actividades.length === 0) {
    await bot.sendMessage(remitente, { text: '⚠️ No hay actividades disponibles en este momento.' });
    return;
  }
  if (!mensaje || mensaje === '3') {
    // Show menu
    let menu = '📋 *Experiencias Locales*:\n';
    actividades.forEach((actividad, index) => {
      menu += `${index + 1}. ${actividad.nombre}\n`;
    });
    menu += 'Por favor, selecciona el número o nombre de la actividad para ver más detalles.';
    await bot.sendMessage(remitente, { text: menu });
    await establecerEstado(remitente, 'experienciasLocales');
  } else {
    // Handle selection by number or name/id
    const input = mensaje.trim().toLowerCase();

    let actividad = null;

    // Try to parse as number index
    const seleccionNum = parseInt(input);
    if (!isNaN(seleccionNum) && seleccionNum >= 1 && seleccionNum <= actividades.length) {
      actividad = actividades[seleccionNum - 1];
    } else {
      // Try to find by id or name (case insensitive)
      actividad = actividades.find(act =>
        act.id.toLowerCase() === input ||
        act.nombre.toLowerCase() === input
      );
    }

    if (!actividad) {
      await bot.sendMessage(remitente, { text: '⚠️ Selección inválida. Por favor, ingresa un número o nombre válido del menú.' });
      return;
    }

    let detalles = `📌 *${actividad.nombre}* (${actividad.categoria} - ${actividad.subcategoria})\n\n`;

    detalles += `📝 *Descripción:*\n${actividad.descripcion}\n\n`;

    detalles += `📍 *Ubicación:*\nDirección: ${actividad.ubicacion.direccion}\nCómo llegar: ${actividad.ubicacion.comoLlegar}\nReferencias: ${actividad.ubicacion.referencias}\n\n`;

    detalles += `📞 *Contacto:*\nTeléfono: ${actividad.contacto.telefono}\nWhatsApp: ${actividad.contacto.whatsapp}\nEmail: ${actividad.contacto.email}\nSitio Web: ${actividad.contacto.sitioWeb}\n\n`;

    detalles += `⏰ *Horarios:*\nGeneral: ${actividad.horarios.general}\nReservas: ${actividad.horarios.reservas}\nDuración: ${actividad.horarios.duracion || actividad.duracion || 'N/A'}\n\n`;

    if (actividad.precios && typeof actividad.precios === 'object') {
      const adulto = actividad.precios.adulto ?? 'N/A';
      const nino = actividad.precios.nino ?? 'N/A';
      const descuentoGrupo = actividad.precios.descuentoGrupo ?? 'N/A';
      const grupoMinimo = actividad.precios.grupoMinimo ?? 'N/A';
      const incluye = Array.isArray(actividad.precios.incluye) ? actividad.precios.incluye.join(', ') : 'N/A';
      const moneda = actividad.precios.moneda ?? '';
      detalles += `💰 *Precios:*\nAdulto: ${adulto} ${moneda}\nNiño: ${nino} ${moneda}\nDescuento grupo: ${descuentoGrupo}% para mínimo ${grupoMinimo} personas\nIncluye: ${incluye}\n\n`;
    } else if (actividad.menu && typeof actividad.menu === 'object') {
      const especialidades = Array.isArray(actividad.menu.especialidades) ? actividad.menu.especialidades.join(', ') : 'N/A';
      const entradas = actividad.menu.rangoPrecio?.entradas ?? 'N/A';
      const platillosPrincipales = actividad.menu.rangoPrecio?.platillosPrincipales ?? 'N/A';
      const postres = actividad.menu.rangoPrecio?.postres ?? 'N/A';
      const bebidas = actividad.menu.rangoPrecio?.bebidas ?? 'N/A';
      const opcionesEspeciales = Array.isArray(actividad.menu.opcionesEspeciales) ? actividad.menu.opcionesEspeciales.join(', ') : 'N/A';
      detalles += `💰 *Menú y Precios:*\nEspecialidades: ${especialidades}\nRango de precios:\nEntradas: ${entradas}\nPlatillos principales: ${platillosPrincipales}\nPostres: ${postres}\nBebidas: ${bebidas}\nOpciones especiales: ${opcionesEspeciales}\n\n`;
    } else {
      detalles += `💰 *Precios:* Información no disponible.\n\n`;
    }

    detalles += `🛎️ *Servicios:*\n${actividad.servicios.join(', ')}\n\n`;

    detalles += `🎯 *Dificultad:* ${actividad.dificultad}\nEdad mínima: ${actividad.edadMinima}\nCapacidad máxima: ${actividad.capacidadMaxima}\n\n`;

    detalles += `📅 *Disponibilidad:*\nTemporada alta: ${actividad.disponibilidad.temporadaAlta}\nTemporada baja: ${actividad.disponibilidad.temporadaBaja}\nDías cerrados: ${actividad.disponibilidad.diasCerrado.join(', ')}\nClima ideal: ${actividad.disponibilidad.climaIdeal}\n\n`;

    detalles += `📸 *Multimedia:*\nFoto principal: ${actividad.multimedia.fotoPrincipal}\nGalería:\n${actividad.multimedia.galeria.join('\n')}\nVideo: ${actividad.multimedia.video}\n\n`;

    detalles += `⭐ *Calificación promedio:* ${actividad.calificacion.promedio} (${actividad.calificacion.totalResenas} reseñas)\n\n`;

    detalles += `📜 *Certificaciones:*\n${actividad.certificaciones.join(', ')}\n\n`;

    detalles += `🗣️ *Idiomas disponibles:* ${actividad.idiomas.join(', ')}\n\n`;

    if (actividad.recomendaciones && typeof actividad.recomendaciones === 'object') {
      const queTraer = Array.isArray(actividad.recomendaciones.queTraer) ? actividad.recomendaciones.queTraer.join(', ') : 'N/A';
      const noRecomendado = Array.isArray(actividad.recomendaciones.noRecomendado) ? actividad.recomendaciones.noRecomendado.join(', ') : 'N/A';
      const consejos = actividad.recomendaciones.consejos ?? 'N/A';
      detalles += `🔖 *Recomendaciones:*\nQué traer: ${queTraer}\nNo recomendado: ${noRecomendado}\nConsejos: ${consejos}\n\n`;
    } else {
      detalles += `🔖 *Recomendaciones:* Información no disponible.\n\n`;
    }

    detalles += `Escribe "menu" para volver al menú principal.`;

    await bot.sendMessage(remitente, { text: detalles });
  }
}

module.exports = { handleExperienciasLocales };
