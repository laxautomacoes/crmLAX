-- Create lead_sources table
CREATE TABLE IF NOT EXISTS public.lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- Enable RLS on lead_sources
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for lead_sources
CREATE POLICY "Lead sources are tenant isolated" ON public.lead_sources
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Add lead_source column to leads table
-- Note: lead_source will store the name (text) for simplicity as requested
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Insert default options for all existing tenants (optional, but good for starting)
-- We'll do this on the fly in the application logic if needed, 
-- but we can pre-populate if we have tenants.
-- For now, the application will handle the defaults if none exist.
