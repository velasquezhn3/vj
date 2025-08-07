const path = require('path');
const db = require(path.resolve(__dirname, '../db'));

async function setupUserStateTriggers() {
  try {
    console.log('Configurando triggers para actualización automática de estados de usuarios...');

    // Trigger para actualizar estado después de insertar una reserva
    await db.runExecute(`
      CREATE TRIGGER IF NOT EXISTS update_user_state_after_reservation_insert
      AFTER INSERT ON Reservations
      FOR EACH ROW
      BEGIN
        UPDATE Users 
        SET is_active = (
          CASE 
            WHEN EXISTS(
              SELECT 1 FROM Reservations 
              WHERE user_id = NEW.user_id 
              AND (status IN ('confirmado', 'confirmada', 'pendiente', 'pending', 'confirmed'))
              AND date(end_date) >= date('now')
            ) THEN 1
            ELSE 0
          END
        ),
        updated_at = datetime('now')
        WHERE user_id = NEW.user_id;
      END;
    `);

    // Trigger para actualizar estado después de actualizar una reserva
    await db.runExecute(`
      CREATE TRIGGER IF NOT EXISTS update_user_state_after_reservation_update
      AFTER UPDATE ON Reservations
      FOR EACH ROW
      BEGIN
        UPDATE Users 
        SET is_active = (
          CASE 
            WHEN EXISTS(
              SELECT 1 FROM Reservations 
              WHERE user_id = NEW.user_id 
              AND (status IN ('confirmado', 'confirmada', 'pendiente', 'pending', 'confirmed'))
              AND date(end_date) >= date('now')
            ) THEN 1
            ELSE 0
          END
        ),
        updated_at = datetime('now')
        WHERE user_id = NEW.user_id;
        
        -- También actualizar el usuario anterior si cambió el user_id
        UPDATE Users 
        SET is_active = (
          CASE 
            WHEN EXISTS(
              SELECT 1 FROM Reservations 
              WHERE user_id = OLD.user_id 
              AND (status IN ('confirmado', 'confirmada', 'pendiente', 'pending', 'confirmed'))
              AND date(end_date) >= date('now')
            ) THEN 1
            ELSE 0
          END
        ),
        updated_at = datetime('now')
        WHERE user_id = OLD.user_id AND OLD.user_id != NEW.user_id;
      END;
    `);

    // Trigger para actualizar estado después de eliminar una reserva
    await db.runExecute(`
      CREATE TRIGGER IF NOT EXISTS update_user_state_after_reservation_delete
      AFTER DELETE ON Reservations
      FOR EACH ROW
      BEGIN
        UPDATE Users 
        SET is_active = (
          CASE 
            WHEN EXISTS(
              SELECT 1 FROM Reservations 
              WHERE user_id = OLD.user_id 
              AND (status IN ('confirmado', 'confirmada', 'pendiente', 'pending', 'confirmed'))
              AND date(end_date) >= date('now')
            ) THEN 1
            ELSE 0
          END
        ),
        updated_at = datetime('now')
        WHERE user_id = OLD.user_id;
      END;
    `);

    console.log('✅ Triggers configurados exitosamente');
    console.log('Los estados de usuarios se actualizarán automáticamente cuando cambien las reservas');

  } catch (error) {
    console.error('❌ Error configurando triggers:', error);
  } finally {
    process.exit();
  }
}

setupUserStateTriggers();
