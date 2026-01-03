-- 1. Create Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.profile_role DEFAULT 'user',
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" 
ON public.invitations FOR ALL 
USING (
  tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() AND (p.role = 'admin' OR p.role = 'superadmin'))
);

DROP POLICY IF EXISTS "Public can view valid invitation details" ON public.invitations;
CREATE POLICY "Public can view valid invitation details" 
ON public.invitations FOR SELECT 
USING (expires_at > now() AND used_at IS NULL);

-- 2. Update handle_new_user function coming from migrations/20250103170000_auth_fixes.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id UUID;
  invitation_record RECORD;
BEGIN
  -- Check if there's an invitation token in metadata
  IF (new.raw_user_meta_data->>'invitation_token') IS NOT NULL THEN
    -- Find and validate invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = (new.raw_user_meta_data->>'invitation_token')
    AND email = new.email
    AND expires_at > now()
    AND used_at IS NULL;

    IF invitation_record.id IS NOT NULL THEN
      -- User is invited, join existing tenant
      INSERT INTO public.profiles (id, tenant_id, full_name, role)
      VALUES (
        new.id,
        invitation_record.tenant_id,
        new.raw_user_meta_data->>'full_name',
        invitation_record.role
      );

      -- Mark invitation as used
      UPDATE public.invitations 
      SET used_at = now() 
      WHERE id = invitation_record.id;

      RETURN new;
    END IF;
  END IF;

  -- Default flow: Create a new tenant (Sign up as Admin)
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'tenant-' || substr(md5(random()::text), 1, 8)
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, role)
  VALUES (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data->>'full_name',
    'admin' -- Corrected: New signups are admins by default
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
