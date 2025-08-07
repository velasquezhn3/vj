const db = require('../db');

async function checkSchema() {
  try {
    console.log('🔍 Verificando estructura de la tabla Activities...');
    
    // Verificar si la tabla existe
    const tables = await db.runQuery(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Activities'
    `);
    
    if (tables.length === 0) {
      console.log('❌ La tabla Activities no existe');
      return;
    }
    
    // Obtener información de las columnas
    const columns = await db.runQuery('PRAGMA table_info(Activities)');
    
    console.log('📋 Columnas encontradas:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) - ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? '- PRIMARY KEY' : ''}`);
    });
    
    // Contar registros
    const count = await db.runQuery('SELECT COUNT(*) as total FROM Activities');
    console.log(`📊 Total de registros: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
