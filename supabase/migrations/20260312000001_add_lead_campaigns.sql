-- Adicionar coluna de campanha na tabela de leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS campaign TEXT;

-- Criar tabela para armazenar opções de campanhas por origem e tenant
CREATE TABLE IF NOT EXISTS lead_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, source_name, name)
);

-- Ativar RLS
ALTER TABLE lead_campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lead_campaigns
CREATE POLICY "Users can view campaigns for their tenant"
    ON lead_campaigns FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert campaigns for their tenant"
    ON lead_campaigns FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update campaigns for their tenant"
    ON lead_campaigns FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete campaigns for their tenant"
    ON lead_campaigns FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
