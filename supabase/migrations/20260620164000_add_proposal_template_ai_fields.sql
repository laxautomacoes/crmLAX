-- Adicionar colunas em proposal_templates para suporte a IA e provedores
ALTER TABLE public.proposal_templates 
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS mapped_fields jsonb DEFAULT '[]'::jsonb;

-- Adicionar colunas em proposals para tracking do template e pdf final gerado
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS generated_pdf_url text,
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.proposal_templates(id) ON DELETE SET NULL;
