const fs = require('fs');
const path = require('path');

// Archivo a modificar
const filePath = path.join(__dirname, 'controllers/flows/reservationHandlers.js');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Realizar los reemplazos
content = content.replace(/Villa Jardines S\.A\./g, 'Villas Julie S.A.');

// Escribir el archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('Archivo actualizado: se cambiaron todas las referencias de "Villa Jardines S.A." a "Villas Julie S.A."');
