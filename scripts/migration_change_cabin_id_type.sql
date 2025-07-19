-- Migration script to change cabin_id column type in Reservations from INTEGER to TEXT

BEGIN TRANSACTION;

-- Create new table with cabin_id as TEXT
CREATE TABLE Reservations_new (
    reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    cabin_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    total_price REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    comprobante_nombre_archivo TEXT,
    grupoMessageId TEXT
);

-- Copy data from old table to new table, casting cabin_id to TEXT
INSERT INTO Reservations_new (
    reservation_id,
    user_id,
    cabin_id,
    start_date,
    end_date,
    status,
    total_price,
    created_at,
    updated_at,
    comprobante_nombre_archivo,
    grupoMessageId
)
SELECT
    reservation_id,
    user_id,
    CAST(cabin_id AS TEXT),
    start_date,
    end_date,
    status,
    total_price,
    created_at,
    updated_at,
    comprobante_nombre_archivo,
    grupoMessageId
FROM Reservations;

-- Drop old table
DROP TABLE Reservations;

-- Rename new table to old table name
ALTER TABLE Reservations_new RENAME TO Reservations;

COMMIT;
