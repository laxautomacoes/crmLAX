-- Enable public access for tenants (needed for the site to load)
DROP POLICY IF EXISTS "Tenants are publicly readable" ON public.tenants;
CREATE POLICY "Tenants are publicly readable" 
ON public.tenants FOR SELECT 
USING (true);

-- Enable public access for assets (needed for the site listings)
DROP POLICY IF EXISTS "Assets are publicly readable" ON public.assets;
CREATE POLICY "Assets are publicly readable" 
ON public.assets FOR SELECT 
USING (true);

-- Enable public access for profiles (needed to get WhatsApp number of admins)
DROP POLICY IF EXISTS "Admin profiles are publicly readable" ON public.profiles;
CREATE POLICY "Admin profiles are publicly readable" 
ON public.profiles FOR SELECT 
USING (role IN ('admin', 'superadmin'));
