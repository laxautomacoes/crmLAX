-- 1. Renomear tabelas principais
ALTER TABLE properties RENAME TO properties;
ALTER TABLE traffic_sources RENAME TO traffic_sources;
ALTER TABLE financial_transactions RENAME TO financial_transactions;

-- 2. Traduzir colunas de traffic_sources (traffic_sources)
ALTER TABLE traffic_sources RENAME COLUMN campanha_id TO campaign_id;
ALTER TABLE traffic_sources RENAME COLUMN campanha_nome TO campaign_name;
ALTER TABLE traffic_sources RENAME COLUMN custo TO cost;
ALTER TABLE traffic_sources RENAME COLUMN data_fim TO end_date;
ALTER TABLE traffic_sources RENAME COLUMN data_inicio TO start_date;
ALTER TABLE traffic_sources RENAME COLUMN moeda TO currency;
ALTER TABLE traffic_sources RENAME COLUMN plataforma TO platform;

-- 3. Traduzir colunas de financial_transactions (financial_transactions)
ALTER TABLE financial_transactions RENAME COLUMN categoria TO category;
ALTER TABLE financial_transactions RENAME COLUMN data_transacao TO transaction_date;
ALTER TABLE financial_transactions RENAME COLUMN descricao TO description;
ALTER TABLE financial_transactions RENAME COLUMN fonte TO source;
ALTER TABLE financial_transactions RENAME COLUMN tipo TO type;
ALTER TABLE financial_transactions RENAME COLUMN valor TO amount;

-- 4. Adicionar suporte a slugs na nova tabela properties (properties antigo)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug TEXT;

-- Função para gerar slug amigável
CREATE OR REPLACE FUNCTION generate_property_slug(title TEXT, id UUID) 
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(translate(title, 'áéíóúàèìòùâêîôûãõäëïöüçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÄËÏÖÜÇ', 'aeiouaeiouaeiouaoaeioucaeiouaeiouaeiouaoaeiouc'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Trigger para automatizar o slug
CREATE OR REPLACE FUNCTION properties_slug_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.title IS NOT NULL THEN
    NEW.slug := generate_property_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_properties_slug ON properties;
CREATE TRIGGER tr_properties_slug
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION properties_slug_trigger();

-- Popular slugs existentes
UPDATE properties SET slug = generate_property_slug(title, id) WHERE slug IS NULL;

-- 5. Atualizar Status para Inglês (Migration de Dados)
UPDATE properties SET status = 'Available' WHERE status = 'Available';
UPDATE properties SET status = 'Pending' WHERE status = 'Pending';
UPDATE properties SET status = 'Sold' WHERE status = 'Vendido';
UPDATE properties SET status = 'Rented' WHERE status = 'Alugado';

-- 6. Recriar RLS Policies (Pode ser necessário dependendo da configuração atual)
-- Isso é mais complexo pois exige saber as policies atuais. 
-- Normalmente, o ALTER TABLE RENAME mantém as policies, mas o conteúdo da policy pode referenciar o nome antigo.
-- Se houver erro, precisaremos dropar e recriar as políticas.
