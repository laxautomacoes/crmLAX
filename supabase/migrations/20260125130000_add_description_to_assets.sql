-- Migration to add description column to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS description TEXT;
