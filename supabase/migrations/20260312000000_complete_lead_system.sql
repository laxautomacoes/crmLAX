-- 1. Tabelas de Campanhas e Origens (caso não tenham sido criadas)
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS lead_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source_name, name)
);

-- 2. Alterações na tabela leads para suportar Origem, Campanha e Distribuição
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT;

-- 3. Alterações na tabela profiles para Fila de Atendimento (Round Robin)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active_for_service BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_lead_assigned_at TIMESTAMPTZ;

-- 4. RLS para as novas tabelas
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas para lead_sources
DROP POLICY IF EXISTS "Users can view sources for their tenant" ON lead_sources;
CREATE POLICY "Users can view sources for their tenant" ON lead_sources FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert sources for their tenant" ON lead_sources;
CREATE POLICY "Users can insert sources for their tenant" ON lead_sources FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Políticas para lead_campaigns
DROP POLICY IF EXISTS "Users can view campaigns for their tenant" ON lead_campaigns;
CREATE POLICY "Users can view campaigns for their tenant" ON lead_campaigns FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert campaigns for their tenant" ON lead_campaigns;
CREATE POLICY "Users can insert campaigns for their tenant" ON lead_campaigns FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 5. Função de ajuda para encontrar o próximo corretor (Opcional, pode ser via código)
-- Mas para robustez, vamos gerenciar via Server Action no Next.js como planejado.
