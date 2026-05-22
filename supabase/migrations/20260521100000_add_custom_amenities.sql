-- Adiciona a coluna para armazenar as áreas comuns criadas pelos usuários/admins
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS custom_amenities JSONB DEFAULT '[]'::jsonb;
