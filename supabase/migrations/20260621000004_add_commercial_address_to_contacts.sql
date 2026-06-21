ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS com_address_street TEXT,
ADD COLUMN IF NOT EXISTS com_address_number TEXT,
ADD COLUMN IF NOT EXISTS com_address_complement TEXT,
ADD COLUMN IF NOT EXISTS com_address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS com_address_city TEXT,
ADD COLUMN IF NOT EXISTS com_address_state TEXT,
ADD COLUMN IF NOT EXISTS com_address_zip_code TEXT,
ADD COLUMN IF NOT EXISTS com_address_same BOOLEAN DEFAULT false;
