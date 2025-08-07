const { runQuery } = require('./db.js');

console.log('🔍 Verificando datos en Activities...');

runQuery('SELECT COUNT(*) as count FROM Activities').then(rows => {
  console.log('📊 Total actividades:', rows[0].count);
  
  return runQuery('SELECT id, activity_key, nombre, categoria FROM Activities LIMIT 5');
}).then(rows => {
  console.log('📋 Primeras 5 actividades:');
  if (rows.length === 0) {
    console.log('⚠️ No hay actividades en la base de datos');
  } else {
    rows.forEach(row => {
      console.log(`- ID: ${row.id}, Key: ${row.activity_key}, Nombre: ${row.nombre}, Categoría: ${row.categoria}`);
    });
  }
  
  return runQuery('PRAGMA table_info(Activities)');
}).then(columns => {
  console.log('🏗️ Estructura de la tabla Activities:');
  columns.forEach(col => {
    console.log(`  - ${col.name}: ${col.type}`);
  });
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
