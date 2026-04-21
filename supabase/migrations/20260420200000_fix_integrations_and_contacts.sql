-- Fix Integrations and Contacts constraints

-- 1. Create Integrations Table
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Unique Constraints (Required for UPSERT)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'integrations_tenant_id_provider_key') THEN
        ALTER TABLE public.integrations ADD CONSTRAINT integrations_tenant_id_provider_key UNIQUE (tenant_id, provider);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contacts_phone_tenant_id_key') THEN
        ALTER TABLE public.contacts ADD CONSTRAINT contacts_phone_tenant_id_key UNIQUE (phone, tenant_id);
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Integrations are tenant isolated') THEN
        CREATE POLICY "Integrations are tenant isolated" ON public.integrations
          FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
    END IF;
END $$;
