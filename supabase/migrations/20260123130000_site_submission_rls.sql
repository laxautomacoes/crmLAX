-- Enable public access for lead_stages (needed to find the initial stage for new leads from the site)
DROP POLICY IF EXISTS "Lead stages are publicly readable" ON public.lead_stages;
CREATE POLICY "Lead stages are publicly readable" 
ON public.lead_stages FOR SELECT 
USING (true);

-- Enable public insertion for contacts (needed for new leads from the site)
DROP POLICY IF EXISTS "Contacts can be created publicly" ON public.contacts;
CREATE POLICY "Contacts can be created publicly" 
ON public.contacts FOR INSERT 
WITH CHECK (true);

-- Enable public insertion for leads (needed for new leads from the site)
DROP POLICY IF EXISTS "Leads can be created publicly" ON public.leads;
CREATE POLICY "Leads can be created publicly" 
ON public.leads FOR INSERT 
WITH CHECK (true);

-- Enable public insertion for interactions (needed for new leads from the site)
DROP POLICY IF EXISTS "Interactions can be created publicly" ON public.interactions;
CREATE POLICY "Interactions can be created publicly" 
ON public.interactions FOR INSERT 
WITH CHECK (true);
