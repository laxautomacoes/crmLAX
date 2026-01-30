-- Adicionar coluna is_archived às tabelas principais
ALTER TABLE public.leads ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.assets ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contacts ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;

-- Criar índices para performance nas consultas filtradas
CREATE INDEX idx_leads_is_archived ON public.leads(is_archived);
CREATE INDEX idx_assets_is_archived ON public.assets(is_archived);
CREATE INDEX idx_contacts_is_archived ON public.contacts(is_archived);
