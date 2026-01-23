-- Add videos and documents columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Create property-assets bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-assets', 'property-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
CREATE POLICY "Property assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-assets' );

CREATE POLICY "Authenticated users can upload property assets"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'property-assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own property assets"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'property-assets' AND auth.uid() = owner )
  WITH CHECK ( bucket_id = 'property-assets' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own property assets"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'property-assets' AND auth.uid() = owner );
