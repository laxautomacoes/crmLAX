-- Adicionar coluna para controle de lembrete enviado
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Criar índice para melhorar a performance da busca por lembretes pendentes
CREATE INDEX IF NOT EXISTS idx_calendar_events_reminder_pending 
ON public.calendar_events (start_time) 
WHERE (reminder_sent = FALSE);
