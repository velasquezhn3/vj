const { addKeyword } = require('@bot-whatsapp/bot');
const { flowAlojamientosHandler } = require('../controllers/alojamientosController');

const flowAlojamientos = addKeyword(['1', 'alojamiento', 'cabañas'])
  .addAnswer(flowAlojamientosHandler);

module.exports = { flowAlojamientos };
