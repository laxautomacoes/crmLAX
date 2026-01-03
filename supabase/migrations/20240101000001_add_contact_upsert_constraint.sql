-- Adiciona restrição de unicidade composta para permitir upsert por telefone dentro de cada tenant
ALTER TABLE public.contacts ADD CONSTRAINT contacts_tenant_id_phone_key UNIQUE (tenant_id, phone);
