-- Add notes and media columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Add media columns to leads table (notes already exists)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Create crm-attachments bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-attachments', 'crm-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
CREATE POLICY "CRM attachments are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'crm-attachments' );

CREATE POLICY "Authenticated users can upload CRM attachments"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'crm-attachments' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own CRM attachments"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'crm-attachments' AND auth.uid() = owner )
  WITH CHECK ( bucket_id = 'crm-attachments' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own CRM attachments"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'crm-attachments' AND auth.uid() = owner );
EOF~