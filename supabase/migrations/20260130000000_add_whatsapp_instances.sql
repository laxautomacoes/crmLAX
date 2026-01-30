-- WhatsApp Instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  instance_name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'disconnected',
  qrcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- Ensures only one instance per user
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Add WhatsApp Chat mirroring to Leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_chat JSONB DEFAULT '[]';

-- RLS Policies
CREATE POLICY "Users can manage their own instances" ON public.whatsapp_instances
  FOR ALL USING (user_id = auth.uid());
