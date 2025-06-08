const { addKeyword } = require('@bot-whatsapp/bot');
const { flowActividadesHandler } = require('../controllers/actividadesController');

const flowActividades = addKeyword(['actividades', 'actividad', '2'])
  .addAnswer(flowActividadesHandler);

module.exports = { flowActividades };
