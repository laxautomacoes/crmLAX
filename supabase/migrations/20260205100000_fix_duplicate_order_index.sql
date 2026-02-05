-- Migration: Fix duplicate stages with same order_index
-- Remove duplicates keeping only one stage per order_index per tenant

-- Step 1: Identify and remove duplicates, keeping the one with capitalized name or the oldest
WITH ranked_stages AS (
  SELECT 
    id,
    tenant_id,
    name,
    order_index,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id, order_index 
      ORDER BY 
        -- Prefer capitalized names (e.g., "Visita" over "visita")
        CASE WHEN name ~ '^[A-Z]' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) as rn
  FROM public.lead_stages
)
DELETE FROM public.lead_stages
WHERE id IN (
  SELECT id FROM ranked_stages WHERE rn > 1
);

-- Step 2: Drop the old constraint
ALTER TABLE public.lead_stages
DROP CONSTRAINT IF EXISTS lead_stages_tenant_name_unique;

-- Step 3: Add new constraint for (tenant_id, order_index) to prevent duplicates
ALTER TABLE public.lead_stages
ADD CONSTRAINT lead_stages_tenant_order_unique 
UNIQUE (tenant_id, order_index);

-- Step 4: Also add constraint for (tenant_id, name) to prevent duplicate names
ALTER TABLE public.lead_stages
ADD CONSTRAINT lead_stages_tenant_name_unique 
UNIQUE (tenant_id, name);
