-- Migration: Add unique constraint to lead_stages to prevent duplicates
-- This migration removes existing duplicates and adds a constraint to prevent future duplications

-- Step 1: Remove duplicate stages, keeping only the oldest one for each (tenant_id, name) combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, name 
      ORDER BY created_at ASC, id ASC
    ) as rn
  FROM public.lead_stages
)
DELETE FROM public.lead_stages
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
-- Using (tenant_id, name) as the unique constraint
-- This ensures each tenant can only have one stage with a given name
ALTER TABLE public.lead_stages
ADD CONSTRAINT lead_stages_tenant_name_unique 
UNIQUE (tenant_id, name);

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_stages_tenant_order 
ON public.lead_stages(tenant_id, order_index);
