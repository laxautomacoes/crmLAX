-- ============================================================================
-- Migration: Classificação de Leads por Temperatura (Lead Temperature)
-- Adiciona coluna last_interaction_at + triggers automáticos
-- ============================================================================

-- 1. Adicionar coluna last_interaction_at à tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz DEFAULT now();

-- 2. Preencher leads existentes com a data da última interação (ou created_at)
UPDATE leads SET last_interaction_at = COALESCE(
  (SELECT MAX(created_at) FROM interactions WHERE interactions.lead_id = leads.id),
  leads.created_at,
  now()
);

-- 3. Trigger: atualizar last_interaction_at ao inserir interação
CREATE OR REPLACE FUNCTION update_lead_interaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads SET last_interaction_at = NOW() WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lead_interaction ON interactions;
CREATE TRIGGER trg_update_lead_interaction
AFTER INSERT ON interactions
FOR EACH ROW EXECUTE FUNCTION update_lead_interaction_timestamp();

-- 4. Trigger: atualizar last_interaction_at ao editar lead
CREATE OR REPLACE FUNCTION update_lead_self_interaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Evitar atualização recursiva: só atualiza se algum campo relevante mudou
  -- (não disparar quando a própria last_interaction_at muda)
  IF (OLD.notes IS DISTINCT FROM NEW.notes)
     OR (OLD.stage_id IS DISTINCT FROM NEW.stage_id)
     OR (OLD.value IS DISTINCT FROM NEW.value)
     OR (OLD.source IS DISTINCT FROM NEW.source)
     OR (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
     OR (OLD.property_id IS DISTINCT FROM NEW.property_id)
     OR (OLD.images IS DISTINCT FROM NEW.images)
     OR (OLD.videos IS DISTINCT FROM NEW.videos)
     OR (OLD.documents IS DISTINCT FROM NEW.documents)
     OR (OLD.whatsapp_chat IS DISTINCT FROM NEW.whatsapp_chat)
  THEN
    NEW.last_interaction_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lead_self_interaction ON leads;
CREATE TRIGGER trg_update_lead_self_interaction
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_lead_self_interaction();
