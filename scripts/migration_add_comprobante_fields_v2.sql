-- Migration script to add comprobante fields and grupoMessageId to Reservations table

ALTER TABLE Reservations ADD COLUMN comprobante_nombre_archivo TEXT;

ALTER TABLE Reservations ADD COLUMN grupoMessageId TEXT;

-- Update status column default if needed (SQLite does not support altering default easily)
-- You may need to handle default in application logic

-- If you want to rename or add new status values, handle in application logic
