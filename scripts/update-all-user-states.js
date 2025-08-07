const path = require('path');
const usersService = require(path.resolve(__dirname, '../services/usersService'));

async function initialUserStatesUpdate() {
  try {
    console.log('🔄 Iniciando actualización inicial de estados de usuarios...');
    
    const updatedCount = await usersService.updateUserStatesBasedOnReservations();
    
    console.log(`✅ Actualización completada: ${updatedCount} usuarios actualizados`);
    console.log('');
    console.log('📝 Resumen:');
    console.log('- Los estados se han actualizado basándose en reservas activas/futuras');
    console.log('- Usuario ACTIVO: tiene reservas confirmadas o pendientes con fecha futura');
    console.log('- Usuario INACTIVO: no tiene reservas o solo tiene reservas vencidas');
    console.log('- Los triggers automáticos mantendrán los estados actualizados');
    
  } catch (error) {
    console.error('❌ Error en actualización inicial:', error);
  } finally {
    process.exit();
  }
}

initialUserStatesUpdate();
