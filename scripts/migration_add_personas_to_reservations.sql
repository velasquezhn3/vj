-- Migration to add personas column to Reservations table
BEGIN TRANSACTION;

ALTER TABLE Reservations ADD COLUMN personas INTEGER;

COMMIT;
