-- Migration: Integrar Leads, Propostas, Contratos, Docs e Financeiro
-- Data: 2026-05-24

-- 1. Extensões na tabela properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 0.00;

-- 2. Extensões na tabela leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS sale_value NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS final_commission_rate NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS finance_installments_count INT DEFAULT 1;

-- 3. Tabela para múltiplos imóveis na negociação
CREATE TABLE IF NOT EXISTS public.lead_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'em_analise',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(lead_id, property_id)
);

-- Ativar RLS em lead_properties
ALTER TABLE public.lead_properties ENABLE ROW LEVEL SECURITY;

-- Política de RLS para lead_properties
DROP POLICY IF EXISTS "Lead properties access by role and assignment" ON public.lead_properties;
CREATE POLICY "Lead properties access by role and assignment"
ON public.lead_properties
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_properties.lead_id
        AND leads.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
            OR leads.assigned_to = auth.uid()
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE leads.id = lead_properties.lead_id
        AND leads.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
            OR leads.assigned_to = auth.uid()
        )
    )
);

-- 4. Tabela de Propostas Preenchíveis (com auto-salvar)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    buyer_data JSONB DEFAULT '{}'::jsonb,
    payment_terms JSONB DEFAULT '{}'::jsonb,
    value NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'rascunho',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS em proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Política de RLS para proposals (Apenas admins/superadmins e o corretor criador ou associado ao lead)
DROP POLICY IF EXISTS "Proposals access by role and assignment" ON public.proposals;
CREATE POLICY "Proposals access by role and assignment"
ON public.proposals
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = proposals.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = proposals.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
);

-- 5. Tabela de Templates de Propostas do Admin
CREATE TABLE IF NOT EXISTS public.proposal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS em proposal_templates
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para proposal_templates (Admins podem gerenciar, todos do tenant podem ver)
DROP POLICY IF EXISTS "Proposal templates select" ON public.proposal_templates;
CREATE POLICY "Proposal templates select"
ON public.proposal_templates
FOR SELECT
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Proposal templates modify by admin" ON public.proposal_templates;
CREATE POLICY "Proposal templates modify by admin"
ON public.proposal_templates
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
);

-- 6. Tabela de Documentos e Contratos do Lead
CREATE TABLE IF NOT EXISTS public.lead_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pendente_revisao',
    docusign_envelope_id VARCHAR(255),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS em lead_documents
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;

-- Política de RLS para lead_documents
DROP POLICY IF EXISTS "Lead documents access" ON public.lead_documents;
CREATE POLICY "Lead documents access"
ON public.lead_documents
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = lead_documents.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = lead_documents.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
);
