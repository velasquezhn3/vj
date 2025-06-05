// weatherModule.js
const axios = require('axios');

class WeatherModule {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        // Coordenadas de Tela, Atlántida, Honduras
        this.coordinates = {
            lat: 15.7817,
            lon: -87.4567,
            cityName: 'Tela, Atlántida'
        };
    }

    // Función para obtener emoji según condición climática
    getWeatherEmoji(condition, temp) {
        const conditionLower = condition.toLowerCase();
        
        if (conditionLower.includes('rain') || conditionLower.includes('drizzle')) {
            return '🌧️';
        } else if (conditionLower.includes('thunderstorm')) {
            return '⛈️';
        } else if (conditionLower.includes('snow')) {
            return '❄️';
        } else if (conditionLower.includes('mist') || conditionLower.includes('fog')) {
            return '🌫️';
        } else if (conditionLower.includes('cloud')) {
            return temp > 25 ? '⛅' : '☁️';
        } else if (conditionLower.includes('clear')) {
            return temp > 25 ? '☀️' : '🌤️';
        } else {
            return '🌤️';
        }
    }

    // Función para generar recomendación personalizada
    generateRecommendation(currentTemp, maxTemp, rainProbability, condition) {
        const recommendations = [];
        
        if (currentTemp >= 28 && rainProbability < 30) {
            recommendations.push('¡Perfecto para la piscina! 🏊');
        } else if (currentTemp >= 25 && rainProbability < 20) {
            recommendations.push('¡Ideal para actividades al aire libre! 🌳');
        } else if (rainProbability >= 70) {
            recommendations.push('¡Lleva paraguas! ☂️ Mejor día para actividades bajo techo');
        } else if (rainProbability >= 50) {
            recommendations.push('¡Probable lluvia! 🌦️ Ten a mano un impermeable');
        } else if (currentTemp < 20) {
            recommendations.push('¡Día fresco! 🧥 Lleva una chaqueta ligera');
        } else if (maxTemp >= 30) {
            recommendations.push('¡Día caluroso! 💧 Mantente hidratado');
        } else {
            recommendations.push('¡Buen día! 😊 Disfruta del clima agradable');
        }

        return recommendations[0];
    }

    // Función principal para obtener el pronóstico
    async getWeatherForecast() {
        try {
            // Obtener clima actual
            const currentWeatherUrl = `${this.baseUrl}/weather?lat=${this.coordinates.lat}&lon=${this.coordinates.lon}&appid=${this.apiKey}&units=metric&lang=es`;
            
            // Obtener pronóstico de 5 días
            const forecastUrl = `${this.baseUrl}/forecast?lat=${this.coordinates.lat}&lon=${this.coordinates.lon}&appid=${this.apiKey}&units=metric&lang=es`;

            const [currentResponse, forecastResponse] = await Promise.all([
                axios.get(currentWeatherUrl),
                axios.get(forecastUrl)
            ]);

            const current = currentResponse.data;
            const forecast = forecastResponse.data;

            // Datos de hoy
            const todayTemp = Math.round(current.main.temp);
            const todayMax = Math.round(current.main.temp_max);
            const todayMin = Math.round(current.main.temp_min);
            const todayCondition = current.weather[0].description;
            const todayEmoji = this.getWeatherEmoji(current.weather[0].main, todayTemp);

            // Datos de mañana (primer pronóstico del día siguiente)
            const tomorrow = forecast.list.find(item => {
                const itemDate = new Date(item.dt * 1000);
                const today = new Date();
                return itemDate.getDate() === today.getDate() + 1 && itemDate.getHours() === 12;
            }) || forecast.list[8]; // Fallback al 8vo elemento (aproximadamente mañana)

            const tomorrowTemp = Math.round(tomorrow.main.temp);
            const tomorrowMax = Math.round(tomorrow.main.temp_max);
            const tomorrowMin = Math.round(tomorrow.main.temp_min);
            const tomorrowCondition = tomorrow.weather[0].description;
            const tomorrowEmoji = this.getWeatherEmoji(tomorrow.weather[0].main, tomorrowTemp);
            const rainProbability = Math.round(tomorrow.pop * 100);

            // Generar recomendación
            const recommendation = this.generateRecommendation(
                todayTemp, 
                todayMax, 
                rainProbability, 
                todayCondition
            );

            // Formatear mensaje
            const weatherMessage = `🌦️ *Pronóstico para ${this.coordinates.cityName}:*

• *HOY:* ${todayEmoji} ${todayTemp}°C (Máx: ${todayMax}°C, Mín: ${todayMin}°C)
  _${todayCondition.charAt(0).toUpperCase() + todayCondition.slice(1)}_

• *MAÑANA:* ${tomorrowEmoji} ${tomorrowTemp}°C (Máx: ${tomorrowMax}°C, Lluvia: ${rainProbability}%)
  _${tomorrowCondition.charAt(0).toUpperCase() + tomorrowCondition.slice(1)}_

📌 *Recomendación:* ${recommendation}

_Actualizado: ${new Date().toLocaleString('es-HN', { 
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
})}_`;

            return {
                success: true,
                message: weatherMessage,
                data: {
                    today: {
                        temp: todayTemp,
                        max: todayMax,
                        min: todayMin,
                        condition: todayCondition,
                        emoji: todayEmoji
                    },
                    tomorrow: {
                        temp: tomorrowTemp,
                        max: tomorrowMax,
                        min: tomorrowMin,
                        condition: tomorrowCondition,
                        emoji: tomorrowEmoji,
                        rainProbability: rainProbability
                    },
                    recommendation: recommendation
                }
            };

        } catch (error) {
            console.error('Error al obtener datos del clima:', error);
            
            // Mensaje de error amigable
            const errorMessage = `🌡️ *Pronóstico del Clima*

❌ Lo siento, no pude obtener la información del clima en este momento.

Esto puede deberse a:
• Problemas de conexión a internet
• Servicio temporalmente no disponible
• Error en la API del clima

🔄 Por favor, inténtalo de nuevo en unos minutos.

_Si el problema persiste, contacta al administrador._`;

            return {
                success: false,
                message: errorMessage,
                error: error.message
            };
        }
    }

    // Método para cambiar las coordenadas si es necesario
    setCoordinates(lat, lon, cityName) {
        this.coordinates = { lat, lon, cityName };
    }
}

module.exports = WeatherModule;
