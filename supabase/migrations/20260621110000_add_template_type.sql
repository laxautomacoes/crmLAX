-- Adicionar coluna para categorizar o tipo de documento do template (Proposta, Agenciamento, Genérico)
ALTER TABLE proposal_templates ADD COLUMN template_type TEXT DEFAULT 'proposta' NOT NULL;
