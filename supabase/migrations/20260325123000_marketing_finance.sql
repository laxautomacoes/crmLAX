-- Migração para Expansão CRM LAX: Marketing & Financeiro

-- 1. Tabela de Origens de Tráfego (Custos)
CREATE TABLE IF NOT EXISTS public.origens_trafego (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plataforma TEXT NOT NULL, -- 'meta', 'google', 'tiktok', etc
    campanha_id TEXT,
    campanha_nome TEXT,
    custo DECIMAL(10,2) DEFAULT 0.00,
    moeda TEXT DEFAULT 'BRL',
    data_inicio DATE NOT NULL,
    data_fim DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Transações Financeiras (Open Finance / Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS public.transacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    valor DECIMAL(10,2) NOT NULL,
    tipo TEXT NOT NULL, -- 'entrada' (comissão), 'saida' (gasto marketing/infra)
    categoria TEXT, -- 'marketing', 'comissao', 'aluguel', etc
    descricao TEXT,
    data_transacao TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'pago', -- 'pendente', 'pago', 'cancelado'
    fonte TEXT, -- 'pluggy', 'manual', 'stripe'
    external_id TEXT, -- ID do agregador bancário
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Melhorias na tabela de Leads (Adição de campos para ROI)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS valor_estimado DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- 4. Habilitar RLS para as novas tabelas
ALTER TABLE public.origens_trafego ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_financeiras ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo (Assumindo que tenant_id está no token de autenticação)
-- Nota: Adaptar conforme a lógica de Auth do sistema.
CREATE POLICY "Tenants can view own traffic data" 
ON public.origens_trafego FOR ALL 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can view own transactions" 
ON public.transacoes_financeiras FOR ALL 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
