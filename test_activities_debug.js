console.log('🧪 Testing Activities Service...');

const { loadMenuActivities } = require('./services/menuActivitiesService');

async function testActivities() {
  try {
    console.log('📋 Loading activities...');
    const activities = await loadMenuActivities();
    
    console.log(`✅ Found ${activities.length} activities:`);
    activities.forEach((activity, index) => {
      console.log(`  ${index + 1}. ID: ${activity.activity_id}, Key: ${activity.activity_key}, Name: ${activity.nombre}, Active: ${activity.activo}`);
    });
    
    if (activities.length === 0) {
      console.log('⚠️ No activities found - checking database directly...');
      
      const { runQuery } = require('./db');
      const dbActivities = await runQuery('SELECT * FROM Activities LIMIT 5');
      console.log('📊 Raw DB data:', dbActivities);
    }
    
  } catch (error) {
    console.error('❌ Error testing activities:', error);
  }
}

testActivities();
