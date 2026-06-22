-- Create tenant_invoices table to store billing history
CREATE TABLE IF NOT EXISTS public.tenant_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL, -- 'stripe' or 'abacatepay'
    gateway_invoice_id TEXT UNIQUE NOT NULL, -- The invoice ID from the gateway
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'paid', -- 'paid', 'pending', 'failed'
    payment_method TEXT, -- 'credit_card', 'pix', 'boleto', etc
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    invoice_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tenant_invoices ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Tenants can view own invoices" 
ON public.tenant_invoices FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
