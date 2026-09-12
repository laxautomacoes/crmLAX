-- Adiciona coluna target_stage_id na tabela followup_steps
ALTER TABLE followup_steps 
ADD COLUMN IF NOT EXISTS target_stage_id UUID REFERENCES lead_stages(id) ON DELETE SET NULL;
