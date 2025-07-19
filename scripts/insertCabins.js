const db = require('../db');
const cabinsData = require('../data/cabañas.json');

async function insertCabins() {
  try {
    await db.runExecute('BEGIN TRANSACTION');

    for (const cabin of cabinsData) {
      const result = await db.runExecute(
        "INSERT INTO Cabins (name, capacity, description, price) VALUES (?, ?, ?, ?)",
        [
          cabin.nombre,
          cabin.capacidad,
          cabin.descripcion,
          cabin.precio_noche
        ]
      );

      const cabinId = result.lastID;
      console.log("Insertada cabaña: " + cabin.nombre + " (ID: " + cabinId + ")");

      for (const [index, photoUrl] of cabin.fotos.entries()) {
        await db.runExecute(
          "INSERT INTO CabinPhotos (cabin_id, url) VALUES (?, ?)",
          [cabinId, photoUrl]
        );
        console.log("  Foto " + (index + 1) + " insertada");
      }
    }

    await db.runExecute('COMMIT');
    console.log('\\n¡Todas las cabañas insertadas exitosamente!');
  } catch (error) {
    await db.runExecute('ROLLBACK');
    console.error('Error durante la inserción:', error);
  }
}

insertCabins();
