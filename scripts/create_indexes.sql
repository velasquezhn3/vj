-- ============================================================================
-- ÍNDICES CRÍTICOS PARA OPTIMIZACIÓN DE RENDIMIENTO
-- Bot VJ - Sistema de Reservas Villas Julie
-- ============================================================================

-- Índices para tabla Reservations (consultas más frecuentes)
CREATE INDEX IF NOT EXISTS idx_reservations_dates 
ON Reservations(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_reservations_status 
ON Reservations(status);

CREATE INDEX IF NOT EXISTS idx_reservations_user_id 
ON Reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_reservations_cabin_id 
ON Reservations(cabin_id);

CREATE INDEX IF NOT EXISTS idx_reservations_created_at 
ON Reservations(created_at);

-- Índices para tabla Users (búsquedas por teléfono)
CREATE INDEX IF NOT EXISTS idx_users_phone 
ON Users(phone_number);

CREATE INDEX IF NOT EXISTS idx_users_role 
ON Users(role);

-- Índices para tabla ConversationStates (bot states)
CREATE INDEX IF NOT EXISTS idx_conversation_states_user 
ON ConversationStates(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_states_timestamp 
ON ConversationStates(timestamp);

-- Índices para tabla Cabins (búsquedas por capacidad)
CREATE INDEX IF NOT EXISTS idx_cabins_capacity 
ON Cabins(capacity);

CREATE INDEX IF NOT EXISTS idx_cabins_name 
ON Cabins(name);

-- Índices para nuevas tablas si existen
CREATE INDEX IF NOT EXISTS idx_user_states_user_number 
ON UserStates(user_number) WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='UserStates');

CREATE INDEX IF NOT EXISTS idx_user_states_expires 
ON UserStates(expires_at) WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='UserStates');

-- Análisis de uso de índices
ANALYZE;

-- Información de índices creados
SELECT 'Índices creados exitosamente' as status;
