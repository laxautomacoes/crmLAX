ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS marriage_date date,
ADD COLUMN IF NOT EXISTS rg_cnh text,
ADD COLUMN IF NOT EXISTS rg_cnh_date text,
ADD COLUMN IF NOT EXISTS issuing_agency text;
