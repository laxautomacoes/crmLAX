-- 1. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new tenant for the user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'tenant-' || substr(md5(random()::text), 1, 8)
  )
  RETURNING id INTO new_tenant_id;

  -- Create the profile
  INSERT INTO public.profiles (id, tenant_id, full_name, role)
  VALUES (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data->>'full_name',
    'superadmin'
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS Fixes for Profiles
-- Drop old problematic policy
DROP POLICY IF EXISTS "Profiles are tenant isolated" ON public.profiles;

-- New more specific policies
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can view profiles in same tenant" 
ON public.profiles FOR SELECT 
USING (
  tenant_id = (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- 4. RLS Fixes for Tenants
DROP POLICY IF EXISTS "Tenants are visible to members" ON public.tenants;

CREATE POLICY "Tenants are visible to members" 
ON public.tenants FOR SELECT 
USING (
  id IN (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid())
);
