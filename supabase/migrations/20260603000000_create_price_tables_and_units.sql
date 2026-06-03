-- Migração: Sistema de Tabelas de Preços e Unidades de Empreendimento
-- Data: 2026-06-03

-- 1. Tabela de versões de tabelas de preços por empreendimento
CREATE TABLE IF NOT EXISTS public.property_price_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reference_month VARCHAR(7) NOT NULL,
    index_type VARCHAR(20) DEFAULT 'CUB',
    index_value NUMERIC(12, 2),
    payment_structure JSONB DEFAULT '{}'::jsonb,
    file_url TEXT,
    template_file_url TEXT,
    template_mapping JSONB DEFAULT '{}'::jsonb,
    total_units INTEGER DEFAULT 0,
    available_units INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- 2. Tabela de unidades individuais de cada empreendimento
CREATE TABLE IF NOT EXISTS public.property_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    price_table_id UUID REFERENCES public.property_price_tables(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    block_tower VARCHAR(100),
    floor INTEGER,
    garage_type VARCHAR(30),
    garage_number VARCHAR(20),
    hobby_box VARCHAR(20),
    hobby_box_number VARCHAR(20),
    area_total NUMERIC(8, 2),
    area_privativa NUMERIC(8, 2),
    valor_ato NUMERIC(12, 2),
    valor_mensais NUMERIC(12, 2),
    valor_reforcos NUMERIC(12, 2),
    valor_chaves NUMERIC(12, 2),
    soma_poupanca NUMERIC(12, 2),
    valor_financiamento NUMERIC(12, 2),
    valor_total NUMERIC(12, 2),
    extra_data JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS para property_price_tables
ALTER TABLE public.property_price_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Price tables tenant isolated" ON public.property_price_tables;
CREATE POLICY "Price tables tenant isolated"
ON public.property_price_tables
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. RLS para property_units
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Units tenant isolated" ON public.property_units;
CREATE POLICY "Units tenant isolated"
ON public.property_units
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_property_units_property_id ON public.property_units(property_id);
CREATE INDEX IF NOT EXISTS idx_property_units_price_table_id ON public.property_units(price_table_id);
CREATE INDEX IF NOT EXISTS idx_property_units_status ON public.property_units(status);
CREATE INDEX IF NOT EXISTS idx_property_price_tables_property_id ON public.property_price_tables(property_id);
CREATE INDEX IF NOT EXISTS idx_property_price_tables_active ON public.property_price_tables(property_id, is_active);

-- 6. Adicionar campo de template de tabela na properties (para tabela-modelo)
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS price_table_template_url TEXT,
ADD COLUMN IF NOT EXISTS price_table_template_mapping JSONB DEFAULT '{}'::jsonb;
