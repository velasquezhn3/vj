/**
 * Script de administración para el servicio de limpieza de reservas
 * 
 * Uso:
 * node scripts/administrar_limpieza.js [comando]
 * 
 * Comandos disponibles:
 * - ejecutar: Ejecuta limpieza manual una vez
 * - estadisticas: Muestra estadísticas de reservas
 * - pendientes: Lista reservas pendientes con tiempo restante
 * - test: Simula limpieza sin eliminar (modo prueba)
 */

const reservaCleanupService = require('../services/reservaCleanupService');
const { runQuery } = require('../db');

async function ejecutarLimpiezaManual() {
  console.log('🔧 LIMPIEZA MANUAL DE RESERVAS PENDIENTES');
  console.log('==========================================\n');
  
  try {
    const resultado = await reservaCleanupService.limpiezaManual();
    
    if (resultado && resultado.estadisticas) {
      console.log('📊 Estadísticas después de la limpieza:');
      resultado.estadisticas.forEach(stat => {
        console.log(`   - ${stat.status}: ${stat.cantidad} reservas`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error en limpieza manual:', error);
  }
}

async function mostrarEstadisticas() {
  console.log('📊 ESTADÍSTICAS DE RESERVAS');
  console.log('============================\n');
  
  try {
    const stats = await reservaCleanupService.obtenerEstadisticas();
    
    if (stats && stats.estadisticas) {
      console.log('Por estado:');
      stats.estadisticas.forEach(stat => {
        console.log(`   - ${stat.status}: ${stat.cantidad} reservas`);
        if (stat.mas_antigua) {
          console.log(`     └─ Más antigua: ${stat.mas_antigua}`);
        }
      });
      
      console.log(`\nÚltima actualización: ${stats.timestamp}`);
    }
    
    // Mostrar estado del servicio
    const estado = reservaCleanupService.getEstado();
    console.log('\n🔧 Estado del servicio de limpieza:');
    console.log(`   - Ejecutándose: ${estado.ejecutandose ? '✅ Sí' : '❌ No'}`);
    console.log(`   - Intervalo: ${estado.intervalo_minutos} minutos`);
    console.log(`   - Tiempo límite: ${estado.tiempo_limite_horas} horas`);
    if (estado.ejecutandose) {
      console.log(`   - Próxima limpieza: ${estado.proximo_cleanup}`);
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

async function listarReservasPendientes() {
  console.log('⏳ RESERVAS PENDIENTES');
  console.log('======================\n');
  
  try {
    const sql = `
      SELECT r.reservation_id, r.created_at, r.start_date, r.end_date,
             u.name as guest_name, u.phone_number,
             julianday('now') - julianday(r.created_at) as dias_transcurridos
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.user_id
      WHERE r.status = 'pendiente'
      ORDER BY r.created_at ASC
    `;
    
    const reservas = await runQuery(sql);
    
    if (reservas.length === 0) {
      console.log('✅ No hay reservas pendientes');
      return;
    }
    
    console.log(`Encontradas ${reservas.length} reservas pendientes:\n`);
    
    reservas.forEach(reserva => {
      const diasTranscurridos = reserva.dias_transcurridos || 0;
      const horasTranscurridas = diasTranscurridos * 24;
      const tiempoRestante = 24 - horasTranscurridas;
      
      const estado = tiempoRestante <= 0 ? '🔴 EXPIRADA' : 
                    tiempoRestante < 2 ? '🟡 EXPIRA PRONTO' : '🟢 VÁLIDA';
      
      console.log(`📋 ID: ${reserva.reservation_id} | ${estado}`);
      console.log(`   👤 Huésped: ${reserva.guest_name || 'Sin nombre'}`);
      console.log(`   📱 Teléfono: ${reserva.phone_number || 'Sin teléfono'}`);
      console.log(`   📅 Fechas: ${reserva.start_date} a ${reserva.end_date}`);
      console.log(`   ⏱️ Creada: ${reserva.created_at || 'Fecha desconocida'}`);
      console.log(`   ⌛ Tiempo transcurrido: ${horasTranscurridas.toFixed(1)} horas`);
      if (tiempoRestante > 0) {
        console.log(`   🕐 Tiempo restante: ${tiempoRestante.toFixed(1)} horas`);
      } else {
        console.log(`   ❌ Expirada hace: ${Math.abs(tiempoRestante).toFixed(1)} horas`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listando reservas pendientes:', error);
  }
}

async function simularLimpieza() {
  console.log('🧪 SIMULACIÓN DE LIMPIEZA');
  console.log('=========================\n');
  
  try {
    // Obtener reservas que serían eliminadas sin eliminarlas
    const sql = `
      SELECT r.reservation_id, r.created_at, r.start_date, r.end_date,
             u.name as guest_name, u.phone_number,
             julianday('now') - julianday(r.created_at) as dias_transcurridos
      FROM Reservations r
      LEFT JOIN Users u ON r.user_id = u.user_id
      WHERE r.status = 'pendiente' 
      AND (
        (r.created_at IS NOT NULL AND julianday('now') - julianday(r.created_at) > 1)
        OR 
        (r.created_at IS NULL AND julianday('now') - julianday('2025-01-01') > 30)
      )
      ORDER BY r.created_at ASC
    `;
    
    const reservasAEliminar = await runQuery(sql);
    
    if (reservasAEliminar.length === 0) {
      console.log('✅ No hay reservas pendientes que eliminar');
      return;
    }
    
    console.log(`⚠️ Se eliminarían ${reservasAEliminar.length} reservas:`);
    console.log('(MODO SIMULACIÓN - NO SE ELIMINAN REALMENTE)\n');
    
    reservasAEliminar.forEach(reserva => {
      const horasExpiradas = (reserva.dias_transcurridos || 0) * 24;
      console.log(`🗑️ ID: ${reserva.reservation_id}`);
      console.log(`   👤 ${reserva.guest_name || 'Sin nombre'} (${reserva.phone_number || 'Sin tel'})`);
      console.log(`   📅 ${reserva.start_date} - ${reserva.end_date}`);
      console.log(`   ⏰ Expirada hace: ${horasExpiradas.toFixed(1)} horas`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error en simulación:', error);
  }
}

async function main() {
  const comando = process.argv[2];
  
  switch (comando) {
    case 'ejecutar':
      await ejecutarLimpiezaManual();
      break;
      
    case 'estadisticas':
      await mostrarEstadisticas();
      break;
      
    case 'pendientes':
      await listarReservasPendientes();
      break;
      
    case 'test':
    case 'simular':
      await simularLimpieza();
      break;
      
    default:
      console.log('🛠️ ADMINISTRADOR DE LIMPIEZA DE RESERVAS');
      console.log('========================================\n');
      console.log('Uso: node scripts/administrar_limpieza.js [comando]\n');
      console.log('Comandos disponibles:');
      console.log('  ejecutar     - Ejecuta limpieza manual una vez');
      console.log('  estadisticas - Muestra estadísticas de reservas');
      console.log('  pendientes   - Lista reservas pendientes con tiempo restante');
      console.log('  test         - Simula limpieza sin eliminar (modo prueba)');
      console.log('\nEjemplos:');
      console.log('  node scripts/administrar_limpieza.js pendientes');
      console.log('  node scripts/administrar_limpieza.js ejecutar');
      break;
  }
}

main().catch(console.error);
