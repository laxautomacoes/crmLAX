-- Migration: Restrigir acesso de usuários comuns (user) no RLS
-- Data: 2026-04-15

-- 1. Atualização das Políticas da Tabela 'leads'
DROP POLICY IF EXISTS "Leads are tenant isolated" ON public.leads;

CREATE POLICY "Leads access by role and assignment"
ON public.leads
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (assigned_to = auth.uid())
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (assigned_to = auth.uid())
    )
);

-- 2. Atualização das Políticas da Tabela 'calendar_events'
DROP POLICY IF EXISTS "Users can view events from their tenant" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can update their tenant events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can delete their tenant events" ON public.calendar_events;

CREATE POLICY "Calendar events access by role and ownership"
ON public.calendar_events
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (profile_id = auth.uid())
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (profile_id = auth.uid())
    )
);

-- 3. Atualização das Políticas da Tabela 'notes'
DROP POLICY IF EXISTS "Notes are tenant isolated" ON public.notes;

CREATE POLICY "Notes access by lead assignment or ownership"
ON public.notes
FOR ALL
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = notes.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
        OR (profile_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.leads 
            WHERE leads.id = notes.lead_id 
            AND leads.assigned_to = auth.uid()
        )
    )
);

-- 4. Garantir que Superadmin possa ver todos os Tenants (Bypass Global)
-- Nota: Esta política permite que o Superadmin veja a lista de todos os tenants na tabela 'tenants'
DROP POLICY IF EXISTS "Tenants are visible to members" ON public.tenants;
CREATE POLICY "Tenants visibility based on role"
ON public.tenants
FOR SELECT
USING (
    id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);
