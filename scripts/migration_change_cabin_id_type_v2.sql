-- Migration to change cabin_id column in Cabins table from INTEGER to TEXT and update IDs to match JSON

BEGIN TRANSACTION;

-- Rename old table
ALTER TABLE Cabins RENAME TO Cabins_old;

-- Create new table with cabin_id as TEXT
CREATE TABLE Cabins (
  cabin_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  capacity INTEGER,
  description TEXT,
  price REAL,
  photos TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert data from old table with updated cabin_id values
INSERT INTO Cabins (cabin_id, name, capacity, description, price, photos, created_at, updated_at)
SELECT
  CASE cabin_id
    WHEN 1 THEN 'cab1'
    WHEN 2 THEN 'cab2'
    WHEN 3 THEN 'cab3'
    ELSE CAST(cabin_id AS TEXT)
  END AS cabin_id,
  name,
  capacity,
  description,
  price,
  photos,
  created_at,
  updated_at
FROM Cabins_old;

-- Drop old table
DROP TABLE Cabins_old;

COMMIT;
