const axios = require('axios');

// Configuración con API key incluida
const UBICACION = '19.1905,-99.9986'; // Coordenadas de Valle Bravo
const CIUDAD = 'Valle Bravo';
const API_KEY = '386e450d4431bfb28281460e06058ace'; // API key incluida
const [lat, lon] = UBICACION.split(',');

async function getClima() {
  try {
    // [1] Obtener clima actual
    const currentRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`,
      { timeout: 5000 }
    );
    
    // [2] Obtener pronóstico para mañana
    const forecastRes = await axios.get(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,alerts&appid=${API_KEY}&units=metric&lang=es`,
      { timeout: 7000 }
    );

    // Procesar datos actuales
    const hoy = currentRes.data;
    const tempActual = Math.round(hoy.main.temp);
    const maxHoy = Math.round(hoy.main.temp_max);
    const minHoy = Math.round(hoy.main.temp_min);
    const descHoy = hoy.weather[0].description;
    
    // Procesar pronóstico de mañana
    const manana = forecastRes.data.daily[1];
    const descManana = manana.weather[0].description;
    const probLluvia = Math.round(manana.pop * 100);
    
    // Generar recomendación
    const recomendacion = probLluvia > 50 
      ? '🌧️ Llevar impermeable' 
      : '☀️ No se necesita protección para lluvia';

    // Formatear respuesta
    return `🌈 *Clima en ${CIUDAD}:*\n` +
      `☀️ HOY: ${tempActual}°C (Máx ${maxHoy}°C | Mín ${minHoy}°C) - ${descHoy}\n` +
      `🌤️ MAÑANA: ${descManana} (${probLluvia}% de lluvia)\n` +
      `🧳 *Recomendación:* ${recomendacion}`;
      
  } catch (error) {
    console.error('Error:', error.message);
    return '⚠️ No se pudo obtener el clima en este momento.';
  }
}

// Ejecutar y mostrar resultado
(async function() {
  const reporteClima = await getClima();
  console.log(reporteClima);
})();

module.exports = {
  getClima
};
