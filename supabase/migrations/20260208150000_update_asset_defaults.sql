-- Migration to update default values for assets table
-- Configure 'apartment' as default type and 'lançamento' as default situacao in details JSONB

-- 1. Update the default value for the type column
ALTER TABLE public.assets ALTER COLUMN type SET DEFAULT 'apartment';

-- 2. Update the default value for the details column to include situacao: lançamento
ALTER TABLE public.assets ALTER COLUMN details SET DEFAULT '{"situacao": "lançamento"}'::jsonb;

-- 3. (Optional) Update any existing 'house' or 'revenda' defaults if needed, 
-- but the request only asked for defaults for "Novo Imóvel" (new properties).
