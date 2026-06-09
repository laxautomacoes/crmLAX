-- Migration: Add rejection_note to properties + enforce is_published=false when Pending

-- 1. Adiciona coluna rejection_note
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS rejection_note TEXT DEFAULT NULL;

-- 2. Corrige dados existentes: imóveis Pending não podem estar publicados
UPDATE properties
SET is_published = false
WHERE status = 'Pending' AND is_published = true;

-- 3. Função de trigger: garante is_published=false sempre que status=Pending
CREATE OR REPLACE FUNCTION enforce_pending_unpublished()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Pending' THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger na tabela properties (INSERT e UPDATE)
DROP TRIGGER IF EXISTS trg_enforce_pending_unpublished ON properties;
CREATE TRIGGER trg_enforce_pending_unpublished
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION enforce_pending_unpublished();
