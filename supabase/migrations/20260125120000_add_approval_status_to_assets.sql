-- Migration to add approval workflow to assets
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Update existing assets to 'approved' so they don't disappear from the site
UPDATE public.assets SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';

-- Add a check constraint to ensure valid statuses
ALTER TABLE public.assets ADD CONSTRAINT check_approval_status 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));
