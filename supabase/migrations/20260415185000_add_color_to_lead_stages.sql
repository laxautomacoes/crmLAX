-- Migration: Add color column to lead_stages
-- Description: Adds a color column to store hex codes for CRM stages, 
-- ensuring compatibility with the on_tenant_created trigger.
-- Date: 2026-04-15

ALTER TABLE public.lead_stages 
ADD COLUMN IF NOT EXISTS color TEXT;
