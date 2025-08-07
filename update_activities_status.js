const db = require('./db');

async function updateActivitiesStatus() {
    console.log('🔄 Actualizando estado de actividades...');
    
    try {
        // Actualizar todas las actividades para que estén activas
        const result = await db.runExecute(`
            UPDATE Activities 
            SET 
                activo = true,
                incluir_en_menu = true,
                orden_menu = COALESCE(orden, 1)
            WHERE activo IS NULL OR activo = false
        `);
        
        console.log(`✅ Actualizadas ${result.changes} actividades`);
        
        // Verificar los datos
        const activities = await db.runQuery(`
            SELECT activity_id, nombre, activo, incluir_en_menu, orden_menu 
            FROM Activities 
            ORDER BY nombre
        `);
        
        console.log('\n📊 Estado actual de actividades:');
        activities.forEach(activity => {
            console.log(`- ${activity.nombre}: activo=${activity.activo}, incluir_en_menu=${activity.incluir_en_menu}, orden_menu=${activity.orden_menu}`);
        });
        
    } catch (error) {
        console.error('❌ Error actualizando actividades:', error);
    }
    
    process.exit(0);
}

updateActivitiesStatus();
