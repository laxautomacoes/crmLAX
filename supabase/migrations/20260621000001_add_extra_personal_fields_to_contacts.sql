ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS naturalness text,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS mother_name text;
