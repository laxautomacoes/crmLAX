-- Migração: Adicionar block_tower na tabela property_price_tables
-- Data: 2026-06-06

ALTER TABLE public.property_price_tables 
ADD COLUMN IF NOT EXISTS block_tower VARCHAR(100);
