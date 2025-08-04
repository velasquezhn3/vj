const db = require('../db');
const cabinTypesData = require('../data/cabañas.json');

async function createCabinTypesTable() {
  try {
    console.log('🔧 Creando tabla CabinTypes para el menú de alojamientos...');
    
    // 1. Crear la tabla CabinTypes
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS CabinTypes (
        type_id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_key TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        capacidad INTEGER NOT NULL,
        habitaciones INTEGER NOT NULL,
        baños INTEGER NOT NULL,
        precio_noche REAL NOT NULL,
        moneda TEXT DEFAULT 'HNL',
        fotos TEXT,
        comodidades TEXT,
        ubicacion TEXT,
        descripcion TEXT,
        orden INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await db.runQuery(createTableSQL);
    console.log('✅ Tabla CabinTypes creada exitosamente');
    
    // 2. Insertar datos desde cabañas.json
    console.log('\n📥 Insertando tipos de cabañas desde cabañas.json...');
    
    for (let i = 0; i < cabinTypesData.length; i++) {
      const cabin = cabinTypesData[i];
      
      // Determinar type_key basado en capacidad
      let typeKey = '';
      if (cabin.capacidad <= 3) typeKey = 'tortuga';
      else if (cabin.capacidad <= 6) typeKey = 'delfin';
      else typeKey = 'tiburon';
      
      const insertSQL = `
        INSERT OR REPLACE INTO CabinTypes (
          type_key, nombre, tipo, capacidad, habitaciones, baños,
          precio_noche, moneda, fotos, comodidades, ubicacion, 
          descripcion, orden, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        typeKey,
        cabin.nombre,
        cabin.tipo,
        cabin.capacidad,
        cabin.habitaciones,
        cabin.baños,
        cabin.precio_noche,
        cabin.moneda || 'HNL',
        JSON.stringify(cabin.fotos || []),
        JSON.stringify(cabin.comodidades || []),
        JSON.stringify(cabin.ubicacion || {}),
        cabin.descripcion || '',
        i + 1, // orden
        true // activo
      ];
      
      await db.runQuery(insertSQL, params);
      console.log(`✅ Insertado: ${cabin.nombre} (${typeKey})`);
    }
    
    // 3. Verificar resultados
    const types = await db.runQuery('SELECT * FROM CabinTypes ORDER BY orden');
    console.log('\n📊 Tipos de cabañas en el menú:');
    
    types.forEach((type, index) => {
      console.log(`\n${index + 1}. ${type.nombre}`);
      console.log(`   - Clave: ${type.type_key}`);
      console.log(`   - Capacidad: ${type.capacidad} personas`);
      console.log(`   - Precio: ${type.moneda} ${type.precio_noche}`);
      console.log(`   - Habitaciones: ${type.habitaciones} | Baños: ${type.baños}`);
      console.log(`   - Activo: ${type.activo ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 Tabla CabinTypes creada y poblada exitosamente!');
    console.log('\n💡 Ahora el menú será administrable desde esta tabla separada.');
    
  } catch (error) {
    console.error('❌ Error durante la creación:', error);
  }
}

createCabinTypesTable();
