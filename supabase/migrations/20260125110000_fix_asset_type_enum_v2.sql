-- Migration to fix asset_type enum for real estate context
-- Adds common real estate types and ensures 'car' is no longer the default

-- Note: ADD VALUE cannot be executed in a transaction block in some Postgres versions.
-- Supabase migrations run in transactions by default, but ADD VALUE is supported since PG 12.

-- 1. Add new real estate types to the existing enum
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'apartment';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'land';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'commercial';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'penthouse';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'studio';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'rural';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'warehouse';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'office';
ALTER TYPE public.asset_type ADD VALUE IF NOT EXISTS 'store';

-- 2. Update the default value for the assets table
ALTER TABLE public.assets ALTER COLUMN type SET DEFAULT 'house';

-- 3. Migrate any existing data that might still be using 'car'
UPDATE public.assets SET type = 'house' WHERE type = 'car';
