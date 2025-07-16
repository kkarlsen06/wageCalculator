-- SQL Migration: Legg til pausefunksjonalitet i shifts tabellen
-- Kjør disse kommandoene i din Supabase SQL Editor

-- 1. Legg til pause_start_hours kolonne
-- Lagrer når pausen starter som timer etter vaktstart (f.eks. 2.5 = 2,5 timer etter vaktstart)
ALTER TABLE shifts 
ADD COLUMN pause_start_hours DECIMAL(4,2) DEFAULT NULL;

-- 2. Legg til pause_duration_hours kolonne  
-- Lagrer varighet av pause i timer (f.eks. 0.5 = 30 minutter)
ALTER TABLE shifts 
ADD COLUMN pause_duration_hours DECIMAL(4,2) DEFAULT 0.5;

-- 3. Legg til kommentarer for dokumentasjon
COMMENT ON COLUMN shifts.pause_start_hours IS 'Timer etter vaktstart når pause begynner (NULL = ingen pause)';
COMMENT ON COLUMN shifts.pause_duration_hours IS 'Varighet av pause i timer (standard 0.5 = 30 min)';

-- 4. Opprett indeks for bedre performance ved spørringer
CREATE INDEX idx_shifts_pause_start ON shifts(pause_start_hours) WHERE pause_start_hours IS NOT NULL;

-- 5. Verifiser at kolonnene ble lagt til korrekt
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'shifts' 
AND column_name IN ('pause_start_hours', 'pause_duration_hours');