-- Migration script to add comprobante fields and estado to reservas table

ALTER TABLE reservas ADD COLUMN estado TEXT DEFAULT 'pendiente';

ALTER TABLE reservas ADD COLUMN comprobante_nombre_archivo TEXT;

-- If you want to keep the old BLOB columns, you can drop them if they exist:
-- ALTER TABLE reservas DROP COLUMN comprobante_data;
-- ALTER TABLE reservas DROP COLUMN comprobante_content_type;

-- Add grupoMessageId column
ALTER TABLE reservas ADD COLUMN grupoMessageId TEXT;
