-- Script para crear la tabla de cabañas físicas y actualizar reservas

-- 1. Crear tabla Cabins
CREATE TABLE IF NOT EXISTS Cabins (
    cabin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- tortuga, delfin, tiburon
    name TEXT NOT NULL, -- nombre descriptivo
    capacity INTEGER NOT NULL
);

-- 2. Insertar cabañas físicas (3 Tortuga, 3 Delfín, 7 Tiburón)
INSERT INTO Cabins (type, name, capacity) VALUES ('tortuga', 'Cabaña Tortuga 1', 3);
INSERT INTO Cabins (type, name, capacity) VALUES ('tortuga', 'Cabaña Tortuga 2', 3);
INSERT INTO Cabins (type, name, capacity) VALUES ('tortuga', 'Cabaña Tortuga 3', 3);
INSERT INTO Cabins (type, name, capacity) VALUES ('delfin', 'Cabaña Delfín 1', 6);
INSERT INTO Cabins (type, name, capacity) VALUES ('delfin', 'Cabaña Delfín 2', 6);
INSERT INTO Cabins (type, name, capacity) VALUES ('delfin', 'Cabaña Delfín 3', 6);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 1', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 2', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 3', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 4', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 5', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 6', 9);
INSERT INTO Cabins (type, name, capacity) VALUES ('tiburon', 'Cabaña Tiburón 7', 9);

-- 3. Modificar tabla Reservations para guardar el id físico de la cabaña
-- (Si ya existe el campo, omitir este paso)
ALTER TABLE Reservations RENAME COLUMN cabin_id TO old_cabin_id;
ALTER TABLE Reservations ADD COLUMN cabin_id INTEGER;

-- 4. Actualizar reservas existentes para que apunten a una cabaña física (opcional, solo si quieres migrar datos)
-- Ejemplo: Asignar las reservas antiguas a la primera cabaña de cada tipo
UPDATE Reservations SET cabin_id = 1 WHERE old_cabin_id = 'cab1'; -- Tortuga
UPDATE Reservations SET cabin_id = 4 WHERE old_cabin_id = 'cab2'; -- Delfín
UPDATE Reservations SET cabin_id = 7 WHERE old_cabin_id = 'cab3'; -- Tiburón

-- 5. Eliminar columna antigua si ya migraste los datos
-- ALTER TABLE Reservations DROP COLUMN old_cabin_id; -- SQLite no soporta DROP COLUMN directamente, requiere recrear la tabla si lo deseas

-- Ahora el backend debe buscar una cabaña física disponible según fechas y tipo antes de crear la reserva.
