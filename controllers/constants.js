/**
 * Archivo para constantes y textos de menú usados en el bot.
 */

const MENU_PRINCIPAL = `🏡 *Bienvenido a Villas Julie* 🌟\n
1. 🌄 Ver Alojamientos Disponibles
2. 📅 Reservar Ahora
3. 🌟 Experiencias Locales
4. 📲 Contacto Rápido
5. 🌦️ Clima Actual
6. ❓ Preguntas Frecuentes
7. 📸 Comparte Experiencia
8. 🛎️ Ayuda Post-Reserva
9. 💎 Programa Fidelidad`;

const ERROR_MENU_PRINCIPAL = '⚠️ No pude cargar el menú principal. Por favor intenta más tarde.';
const ERROR_NO_CABANAS = '⚠️ No hay cabañas disponibles en este momento.';
const ERROR_CARGAR_CABANAS = '⚠️ No pude cargar la lista de cabañas. Por favor intenta más tarde.';
const ERROR_SELECCION_INVALIDA = '⚠️ Selección inválida. Por favor, ingresa un número válido del menú.';
const SELECCION_DETALLE_OPCIONES = 'Selecciona:\n1: Ver más alojamientos\n2: Reservar esta cabaña\n0: Menú principal';
const ERROR_CARGAR_DETALLE_CABANA = '⚠️ No pude cargar los detalles de la cabaña. Por favor intenta seleccionar otra.';

module.exports = {
  MENU_PRINCIPAL,
  ERROR_MENU_PRINCIPAL,
  ERROR_NO_CABANAS,
  ERROR_CARGAR_CABANAS,
  ERROR_SELECCION_INVALIDA,
  SELECCION_DETALLE_OPCIONES,
  ERROR_CARGAR_DETALLE_CABANA
};
