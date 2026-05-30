-- Criando tabela de domínios personalizados para envio de email
CREATE TABLE public.email_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
    resend_domain_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, domain)
);

-- Criando tabela de campanhas de e-mail em massa
CREATE TABLE public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    content_html TEXT,
    content_text TEXT,
    sender_name TEXT,
    sender_email TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sending, completed, cancelled
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_complained INTEGER DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Criando tabela de logs individuais de envio de e-mail (para tracking de aberturas e erros)
CREATE TABLE public.email_campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    resend_email_id TEXT, -- ID retornado pela API da Resend para correlacionar webhooks
    status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, opened, bounced, complained, error
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE
);

-- Criando tabela de descadastramento (opt-out / blacklist)
CREATE TABLE public.email_unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Indexação para performance
CREATE INDEX idx_email_campaigns_tenant ON public.email_campaigns(tenant_id);
CREATE INDEX idx_email_logs_campaign ON public.email_campaign_logs(campaign_id);
CREATE INDEX idx_email_logs_resend_id ON public.email_campaign_logs(resend_email_id);
CREATE INDEX idx_email_unsubscribes_tenant_email ON public.email_unsubscribes(tenant_id, email);

-- RLS (Row Level Security)
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Políticas para email_domains
CREATE POLICY "Tenants can view their own domains" ON public.email_domains
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert domains" ON public.email_domains
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update domains" ON public.email_domains
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete domains" ON public.email_domains
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Políticas para email_campaigns
CREATE POLICY "Tenants can view their own email campaigns" ON public.email_campaigns
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert email campaigns" ON public.email_campaigns
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update email campaigns" ON public.email_campaigns
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete email campaigns" ON public.email_campaigns
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Políticas para email_campaign_logs
CREATE POLICY "Tenants can view their own email logs" ON public.email_campaign_logs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert email logs" ON public.email_campaign_logs
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can update email logs via webhook" ON public.email_campaign_logs
    FOR UPDATE USING (true); -- Permitimos atualização ampla para webhooks (a rota será segura)

-- Políticas para email_unsubscribes
CREATE POLICY "Tenants can view their own unsubscribes" ON public.email_unsubscribes
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert unsubscribes" ON public.email_unsubscribes
    FOR INSERT WITH CHECK (true); -- Permitimos inserção pública para que o link de opt-out funcione sem auth
