-- Adicionar coluna de configurações de e-mail na tabela tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email_settings JSONB DEFAULT '{}';

-- Criar bucket para logos de e-mail
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email-logos', 'email-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança para o Bucket email-logos
-- 1. Visibilidade pública para as logos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Logos de email são visíveis publicamente'
    ) THEN
        CREATE POLICY "Logos de email são visíveis publicamente" ON storage.objects
          FOR SELECT USING (bucket_id = 'email-logos');
    END IF;
END $$;

-- 2. Permissão de upload/gestão para usuários autenticados do respectivo Tenant
-- Nota: O caminho do arquivo deve começar com o tenant_id para isolamento
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Usuários gerenciam suas próprias logos'
    ) THEN
        CREATE POLICY "Usuários gerenciam suas próprias logos" ON storage.objects
          FOR ALL TO authenticated
          USING (
            bucket_id = 'email-logos' AND 
            (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
          )
          WITH CHECK (
            bucket_id = 'email-logos' AND 
            (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
          );
    END IF;
END $$;
