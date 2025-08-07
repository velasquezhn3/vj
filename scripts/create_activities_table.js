const db = require('../db');

async function createActivitiesTable() {
  console.log('🎯 Creando tabla Activities...');
  
  try {
    // Crear tabla Activities
    await db.runQuery(`
      CREATE TABLE IF NOT EXISTS Activities (
        activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_key TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        subcategoria TEXT,
        descripcion TEXT,
        descripcion_corta TEXT,
        ubicacion TEXT, -- JSON string
        contacto TEXT, -- JSON string
        horarios TEXT, -- JSON string
        precios TEXT, -- JSON string
        servicios TEXT, -- JSON string
        dificultad TEXT,
        duracion TEXT,
        capacidad_maxima INTEGER,
        edad_minima INTEGER,
        idiomas TEXT, -- JSON array string
        recomendaciones TEXT, -- JSON string
        disponibilidad TEXT, -- JSON string
        multimedia TEXT, -- JSON string
        calificacion TEXT, -- JSON string
        certificaciones TEXT, -- JSON array string
        orden INTEGER DEFAULT 999,
        activo BOOLEAN DEFAULT true,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabla Activities creada exitosamente');

    // Verificar si hay datos en actividades.json para migrar
    const fs = require('fs');
    const path = require('path');
    const activitiesPath = path.join(__dirname, '../data/actividades.json');
    
    if (fs.existsSync(activitiesPath)) {
      console.log('📥 Migrando datos desde actividades.json...');
      
      const activitiesData = JSON.parse(fs.readFileSync(activitiesPath, 'utf8'));
      
      for (let i = 0; i < activitiesData.length; i++) {
        const activity = activitiesData[i];
        
        try {
          await db.runQuery(`
            INSERT OR IGNORE INTO Activities (
              activity_key, nombre, categoria, subcategoria, descripcion, descripcion_corta,
              ubicacion, contacto, horarios, precios, servicios, dificultad, duracion,
              capacidad_maxima, edad_minima, idiomas, recomendaciones, disponibilidad,
              multimedia, calificacion, certificaciones, orden, activo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            activity.id,
            activity.nombre,
            activity.categoria,
            activity.subcategoria || '',
            activity.descripcion || '',
            activity.descripcionCorta || '',
            JSON.stringify(activity.ubicacion || {}),
            JSON.stringify(activity.contacto || {}),
            JSON.stringify(activity.horarios || {}),
            JSON.stringify(activity.precios || {}),
            JSON.stringify(activity.servicios || []),
            activity.dificultad || '',
            activity.duracion || '',
            activity.capacidadMaxima || 0,
            activity.edadMinima || 0,
            JSON.stringify(activity.idiomas || []),
            JSON.stringify(activity.recomendaciones || {}),
            JSON.stringify(activity.disponibilidad || {}),
            JSON.stringify(activity.multimedia || {}),
            JSON.stringify(activity.calificacion || {}),
            JSON.stringify(activity.certificaciones || []),
            i + 1,
            true
          ]);
          
          console.log(`  ✅ Actividad migrada: ${activity.nombre}`);
        } catch (err) {
          console.log(`  ⚠️ Error migrando actividad ${activity.nombre}:`, err.message);
        }
      }
      
      console.log('✅ Migración de datos completada');
    } else {
      console.log('⚠️ No se encontró actividades.json para migrar');
    }

    // Verificar datos insertados
    const count = await db.runQuery('SELECT COUNT(*) as total FROM Activities');
    console.log(`📊 Total de actividades en base de datos: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Error creando tabla Activities:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createActivitiesTable()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error en el script:', error);
      process.exit(1);
    });
}

module.exports = { createActivitiesTable };
