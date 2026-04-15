-- Migration: Add status column to tenants
-- Possible values: 'active', 'suspended'
-- Default is 'active'

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

COMMENT ON COLUMN public.tenants.status IS 'Status da conta da empresa: active (ativo) ou suspended (bloqueado por falta de pagamento ou outros motivos)';
