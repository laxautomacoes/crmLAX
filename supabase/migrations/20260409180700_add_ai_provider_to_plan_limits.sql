-- Adiciona ai_provider à tabela plan_limits para permitir escolha entre Gemini e OpenAI por plano
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';

-- Comentário para documentação
COMMENT ON COLUMN plan_limits.ai_provider IS 'Provedor de IA padrão para o plano (gemini ou openai)';
