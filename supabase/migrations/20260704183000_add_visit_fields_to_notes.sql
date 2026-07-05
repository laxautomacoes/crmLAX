-- Add visit fields to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_visit BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS visit_number INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS visit_unregistered_property TEXT DEFAULT NULL;

-- Create an index to query visits efficiently
CREATE INDEX IF NOT EXISTS idx_notes_is_visit ON public.notes(is_visit);
