// Prueba rápida del endpoint de reservas inminentes
const fetch = require('node-fetch');

async function testUpcomingReservations() {
  try {
    console.log('Probando endpoint de reservas inminentes...');
    const response = await fetch('http://localhost:4000/admin/reservations/upcoming');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Respuesta del endpoint:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUpcomingReservations();
