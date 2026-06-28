-- Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    company TEXT,
    creci TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Partners are tenant isolated" ON public.partners
    FOR ALL
    USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create trigger for updated_at in partners
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add partnership fields to leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS partner_split NUMERIC CHECK (partner_split >= 0 AND partner_split <= 100),
ADD COLUMN IF NOT EXISTS partner_role TEXT CHECK (partner_role IN ('buyer_agent', 'seller_agent'));

-- Add partnership fields to properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS partner_commission_split NUMERIC CHECK (partner_commission_split >= 0 AND partner_commission_split <= 100);
