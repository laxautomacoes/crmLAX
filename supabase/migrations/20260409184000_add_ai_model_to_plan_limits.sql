-- Adiciona a coluna ai_model à tabela plan_limits
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-3-flash';

-- Preenche valores iniciais razoáveis
UPDATE plan_limits SET ai_model = 'gemini-3-flash' WHERE ai_provider = 'gemini';
UPDATE plan_limits SET ai_model = 'gpt-4o-mini' WHERE ai_provider = 'openai';

-- Comentário para documentação
COMMENT ON COLUMN plan_limits.ai_model IS 'Modelo específico de IA (ex: gpt-5.4, gemini-3.1-pro)';
