-- Migração para a tabela de eventos da agenda
CREATE TYPE calendar_event_type AS ENUM ('duty', 'visit', 'note', 'other');

CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type calendar_event_type DEFAULT 'note',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view events from their tenant"
    ON public.calendar_events FOR SELECT
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert events in their tenant"
    ON public.calendar_events FOR INSERT
    WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant events"
    ON public.calendar_events FOR UPDATE
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant events"
    ON public.calendar_events FOR DELETE
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexação para performance
CREATE INDEX idx_calendar_events_tenant_start ON public.calendar_events (tenant_id, start_time);
CREATE INDEX idx_calendar_events_lead ON public.calendar_events (lead_id);
