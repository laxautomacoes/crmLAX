-- Migration para a tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can view their own notifications"
            ON public.notifications FOR SELECT
            USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can update their own notifications"
            ON public.notifications FOR UPDATE
            USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can delete their own notifications"
            ON public.notifications FOR DELETE
            USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'System can insert notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "System can insert notifications"
            ON public.notifications FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Indexação para performance
CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);
