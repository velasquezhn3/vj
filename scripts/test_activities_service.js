const { loadMenuActivities } = require('../services/menuActivitiesService');

async function testActivitiesService() {
  try {
    console.log('🧪 Probando servicio de actividades...');
    
    const activities = await loadMenuActivities();
    console.log(`✅ Actividades cargadas: ${activities.length}`);
    
    activities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.nombre}`);
      console.log(`   Categoría: ${activity.categoria}`);
      console.log(`   Clave: ${activity.id || activity.activity_key}`);
      console.log(`   Activo: ${activity.activo}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error probando servicio:', error);
  }
}

testActivitiesService()
  .then(() => {
    console.log('✅ Prueba completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
