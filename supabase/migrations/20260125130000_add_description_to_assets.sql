-- Migration to add description column to properties
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS description TEXT;
