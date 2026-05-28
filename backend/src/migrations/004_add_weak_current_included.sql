-- Slaboproud: doplnění atributu zahrnuto/nezahrnuto do PDF sekcí
ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE weak_current_items ADD COLUMN IF NOT EXISTS is_included BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE weak_current_items
SET is_included = TRUE
WHERE is_included IS NULL;
