-- Script para corrigir colunas faltantes na tabela properties
-- Este script adiciona as colunas 'description' e 'created_by' se elas não existirem.

DO $$ 
BEGIN 
    -- Adicionar coluna description se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'description') THEN
        ALTER TABLE public.properties ADD COLUMN description TEXT;
    END IF;

    -- Adicionar coluna created_by se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'created_by') THEN
        ALTER TABLE public.properties ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;

    -- Adicionar coluna is_archived se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'is_archived') THEN
        ALTER TABLE public.properties ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;

    -- Adicionar coluna status se não existir (usando TEXT para evitar problemas com ENUM se não estiver criado)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'status') THEN
        ALTER TABLE public.properties ADD COLUMN status TEXT DEFAULT 'Available';
    END IF;
END $$;

-- Recarregar o cache do PostgREST (opcional, mas útil em Supabase)
NOTIFY pgrst, 'reload schema';
