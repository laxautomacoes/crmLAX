-- Add phone column to invitations
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update handle_new_user function to copy phone to profile
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
      INSERT INTO public.profiles (id, tenant_id, full_name, role, permissions, whatsapp_number)
      VALUES (
        new.id,
        invitation_record.tenant_id,
        COALESCE(new.raw_user_meta_data->>'full_name', invitation_record.name),
        invitation_record.role,
        COALESCE(invitation_record.permissions, '{"dashboard":true,"leads":true,"clients":true,"properties":true,"calendar":true,"reports":true,"settings":false}'::jsonb),
        invitation_record.phone
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

  INSERT INTO public.profiles (id, tenant_id, full_name, role, permissions)
  VALUES (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data->>'full_name',
    'admin',
    '{"dashboard":true,"leads":true,"clients":true,"properties":true,"calendar":true,"reports":true,"settings":true}'::jsonb
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
