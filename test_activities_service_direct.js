const menuActivitiesService = require('./services/menuActivitiesService');

async function testActivitiesService() {
  console.log('🧪 Testing Activities Service...');
  
  try {
    console.log('📥 Loading activities from service...');
    const activities = await menuActivitiesService.loadMenuActivities();
    console.log('✅ Service returned:', activities.length, 'activities');
    
    activities.forEach(activity => {
      console.log(`- ID: ${activity.activity_id}, Key: ${activity.activity_key}, Name: ${activity.nombre}`);
    });
    
  } catch (error) {
    console.error('❌ Service error:', error.message);
  }
  
  process.exit(0);
}

testActivitiesService();
