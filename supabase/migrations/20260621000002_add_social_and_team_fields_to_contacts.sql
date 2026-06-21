ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS favorite_team text;
