const db = require('./db');

async function checkAndUpdateSchema() {
    console.log('🔍 Verificando esquema de tabla Activities...');
    
    try {
        // Verificar esquema actual
        const schema = await db.runQuery("PRAGMA table_info(Activities)");
        console.log('\n📋 Columnas actuales:');
        schema.forEach(col => {
            console.log(`- ${col.name} (${col.type}), NOT NULL: ${col.notnull}, DEFAULT: ${col.dflt_value}`);
        });
        
        // Verificar si las columnas nuevas existen
        const hasIncluirEnMenu = schema.some(col => col.name === 'incluir_en_menu');
        const hasOrdenMenu = schema.some(col => col.name === 'orden_menu');
        
        console.log(`\n🔍 Columnas faltantes:`);
        console.log(`- incluir_en_menu: ${hasIncluirEnMenu ? '✅ Existe' : '❌ Falta'}`);
        console.log(`- orden_menu: ${hasOrdenMenu ? '✅ Existe' : '❌ Falta'}`);
        
        // Agregar columnas faltantes
        if (!hasIncluirEnMenu) {
            console.log('\n➕ Agregando columna incluir_en_menu...');
            await db.runExecute(`ALTER TABLE Activities ADD COLUMN incluir_en_menu BOOLEAN DEFAULT true`);
        }
        
        if (!hasOrdenMenu) {
            console.log('➕ Agregando columna orden_menu...');
            await db.runExecute(`ALTER TABLE Activities ADD COLUMN orden_menu INTEGER DEFAULT 1`);
        }
        
        // Ahora actualizar los valores
        console.log('\n🔄 Actualizando valores...');
        const result = await db.runExecute(`
            UPDATE Activities 
            SET 
                activo = CASE WHEN activo IS NULL THEN true ELSE activo END,
                incluir_en_menu = CASE WHEN incluir_en_menu IS NULL THEN true ELSE incluir_en_menu END,
                orden_menu = CASE WHEN orden_menu IS NULL THEN COALESCE(orden, 1) ELSE orden_menu END
        `);
        
        console.log(`✅ Actualizadas ${result.changes} filas`);
        
        // Verificar datos finales
        const activities = await db.runQuery(`
            SELECT activity_id, nombre, activo, incluir_en_menu, orden_menu 
            FROM Activities 
            ORDER BY nombre
        `);
        
        console.log('\n📊 Estado final de actividades:');
        activities.forEach(activity => {
            console.log(`- ${activity.nombre}: activo=${activity.activo}, incluir_en_menu=${activity.incluir_en_menu}, orden_menu=${activity.orden_menu}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    process.exit(0);
}

checkAndUpdateSchema();
