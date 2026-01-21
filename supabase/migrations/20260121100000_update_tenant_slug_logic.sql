-- Função auxiliar para transformar nomes em slugs (slugify)
CREATE OR REPLACE FUNCTION public.slugify(text)
RETURNS text AS $$
DECLARE
  l_text text := $1;
BEGIN
  -- Remover acentos e caracteres especiais
  l_text := translate(l_text, 'áàâãäåāæçéèêëēíìîïīñóòôõöøōúùûüūýÿ', 'aaaaaaaaceeeeeiiiiinooooooouuuuuyy');
  l_text := translate(l_text, 'ÁÀÂÃÄÅĀÆÇÉÈÊËĒÍÌÎÏĪÑÓÒÔÕÖØŌÚÙÛÜŪÝ', 'AAAAAAAACEEEEEIIIIINOOOOOOOUUUUUY');
  
  -- Converter para minúsculas
  l_text := lower(l_text);
  
  -- Substituir caracteres não alfanuméricos por hífens
  l_text := regexp_replace(l_text, '[^a-z0-0]+', '-', 'g');
  
  -- Remover hífens do início e do fim
  l_text := btrim(l_text, '-');
  
  RETURN l_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Atualizar handle_new_user para usar o nome como base do slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tenant_id UUID;
  invitation_record RECORD;
  base_slug TEXT;
  final_slug TEXT;
  suffix_counter INTEGER := 0;
BEGIN
  -- Check if there's an invitation token in metadata
  IF (new.raw_user_meta_data->>'invitation_token') IS NOT NULL THEN
    -- Find and validate invitation
    SELECT * INTO invitation_record 
    FROM public.invitations 
    WHERE token = (new.raw_user_meta_data->>'invitation_token')
    AND email = new.email
    AND expires_at > now()
    AND used_at IS NULL;

    IF invitation_record.id IS NOT NULL THEN
      -- User is invited, join existing tenant
      INSERT INTO public.profiles (id, tenant_id, full_name, role)
      VALUES (
        new.id,
        invitation_record.tenant_id,
        new.raw_user_meta_data->>'full_name',
        invitation_record.role
      );

      -- Mark invitation as used
      UPDATE public.invitations 
      SET used_at = now() 
      WHERE id = invitation_record.id;

      RETURN new;
    END IF;
  END IF;

  -- Default flow: Create a new tenant (Sign up as Admin)
  -- 1. Gerar base do slug a partir do nome ou email
  base_slug := public.slugify(COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  
  -- Se o slug ficar vazio (ex: nome só com símbolos), usar um padrão seguro
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'tenant-' || substr(md5(random()::text), 1, 8);
  END IF;

  final_slug := base_slug;

  -- 2. Garantir que o slug seja único (tratamento de colisão)
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
    suffix_counter := suffix_counter + 1;
    -- Adiciona sufixo aleatório curto após a primeira tentativa falha
    final_slug := base_slug || '-' || substr(md5(random()::text), 1, 4);
    
    -- Safety break para evitar loop infinito (extremamente improvável com UUID/MD5)
    IF suffix_counter > 10 THEN
      final_slug := base_slug || '-' || gen_random_uuid();
      EXIT;
    END IF;
  END LOOP;

  -- 3. Inserir novo tenant com o slug final
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    final_slug
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.profiles (id, tenant_id, full_name, role)
  VALUES (
    new.id,
    new_tenant_id,
    new.raw_user_meta_data->>'full_name',
    'admin' -- Corrected: New signups are admins by default
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
