const path = require('path');
const fs = require('fs');

const ACTIVIDADES_PATH = path.join(__dirname, '..', 'data', 'actividades.json');

function loadActividades() {
  try {
    const data = fs.readFileSync(ACTIVIDADES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading actividades.json:', error);
    return [];
  }
}

module.exports = {
  loadActividades,
};
