-- Migración para mejorar la tabla Reservations
-- 1. Eliminar el campo old_cabin_id
-- 2. Eliminar reservas duplicadas para la misma cabaña y fechas

-- Eliminar campo old_cabin_id
ALTER TABLE Reservations RENAME TO Reservations_old;

CREATE TABLE Reservations (
  reservation_id INTEGER PRIMARY KEY,
  user_id INTEGER,
  cabin_id INTEGER,
  start_date TEXT,
  end_date TEXT,
  status TEXT,
  total_price INTEGER,
  created_at TEXT,
  updated_at TEXT,
  comprobante_nombre_archivo TEXT,
  grupoMessageId TEXT,
  personas INTEGER
);

-- Insertar solo reservas únicas (no solapadas) para cada cabaña y fechas
INSERT INTO Reservations (
  reservation_id, user_id, cabin_id, start_date, end_date, status, total_price, created_at, updated_at, comprobante_nombre_archivo, grupoMessageId, personas
)
SELECT reservation_id, user_id, cabin_id, start_date, end_date, status, total_price, created_at, updated_at, comprobante_nombre_archivo, grupoMessageId, personas
FROM Reservations_old
WHERE reservation_id IN (
  SELECT MIN(reservation_id)
  FROM Reservations_old
  GROUP BY cabin_id, start_date, end_date
);

DROP TABLE Reservations_old;
