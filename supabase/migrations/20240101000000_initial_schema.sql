-- Enums
CREATE TYPE public.plan_type AS ENUM ('freemium', 'starter', 'pro');
CREATE TYPE public.profile_role AS ENUM ('superadmin', 'admin', 'user');
CREATE TYPE public.asset_type AS ENUM ('car', 'house');
CREATE TYPE public.interaction_type AS ENUM ('whatsapp', 'system', 'note');
CREATE TYPE public.update_type AS ENUM ('feature', 'fix', 'roadmap');

-- Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  plan_type public.plan_type DEFAULT 'freemium',
  branding JSONB DEFAULT '{}',
  api_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  full_name TEXT,
  role public.profile_role DEFAULT 'user',
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (Estoque)
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  type public.asset_type DEFAULT 'car',
  title TEXT NOT NULL,
  price NUMERIC,
  status TEXT,
  details JSONB DEFAULT '{}',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id),
  tenant_id UUID REFERENCES public.tenants(id),
  asset_id UUID REFERENCES public.assets(id),
  status TEXT DEFAULT 'new',
  source TEXT,
  utm_data JSONB DEFAULT '{}',
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id),
  type public.interaction_type DEFAULT 'system',
  content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Usage
CREATE TABLE public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  profile_id UUID REFERENCES public.profiles(id),
  model TEXT,
  total_tokens INTEGER DEFAULT 0,
  feature_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Updates (Public)
CREATE TABLE public.updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type public.update_type DEFAULT 'feature',
  status TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
-- Updates is public, so we might not need strict tenant isolation if it's for system-wide updates, 
-- but project specs say "Updates: id, title, description... (Público)". 
-- If it's public for all tenants to see system updates, RLS should allow SELECT for all.
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can only see/edit their own profile or their tenant's profiles (if admin)
CREATE POLICY "Profiles are tenant isolated" ON public.profiles
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Tenants: Basic read for members
CREATE POLICY "Tenants are visible to members" ON public.tenants
  FOR SELECT USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Contacts: Tenant isolation
CREATE POLICY "Contacts are tenant isolated" ON public.contacts
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Assets: Tenant isolation
CREATE POLICY "Assets are tenant isolated" ON public.assets
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Leads: Tenant isolation
CREATE POLICY "Leads are tenant isolated" ON public.leads
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Interactions: Tenant isolation
CREATE POLICY "Interactions are tenant isolated" ON public.interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = interactions.lead_id 
      AND leads.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- AI Usage: Tenant isolation
CREATE POLICY "AI Usage is tenant isolated" ON public.ai_usage
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Updates: Publicly readable, admin only write
CREATE POLICY "Updates are publicly readable" ON public.updates
  FOR SELECT USING (true);
