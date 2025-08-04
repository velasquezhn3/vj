const db = require('../db');

async function addTypeColumn() {
  try {
    console.log('🔧 Agregando columna "type" a la tabla Cabins...');
    
    // 1. Agregar la columna type
    await db.runQuery('ALTER TABLE Cabins ADD COLUMN type TEXT');
    console.log('✅ Columna "type" agregada exitosamente');
    
    // 2. Actualizar tipos basados en el nombre
    const updates = [
      { pattern: 'Tortuga', type: 'tortuga' },
      { pattern: 'Delfín', type: 'delfin' },
      { pattern: 'Tiburón', type: 'tiburon' }
    ];
    
    for (const update of updates) {
      const result = await db.runQuery(
        `UPDATE Cabins SET type = ? WHERE name LIKE ?`,
        [update.type, `%${update.pattern}%`]
      );
      console.log(`✅ Actualizadas ${result.changes} cabañas tipo "${update.type}"`);
    }
    
    // 3. Verificar resultados
    const cabins = await db.runQuery('SELECT cabin_id, name, type FROM Cabins ORDER BY type, cabin_id');
    console.log('\n📊 Cabañas por tipo:');
    
    const grouped = {};
    cabins.forEach(cabin => {
      if (!grouped[cabin.type]) grouped[cabin.type] = [];
      grouped[cabin.type].push(cabin.name);
    });
    
    Object.entries(grouped).forEach(([type, names]) => {
      console.log(`\n${type.toUpperCase()}: ${names.length} cabañas`);
      names.forEach(name => console.log(`  - ${name}`));
    });
    
    console.log('\n🎉 Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

addTypeColumn();
