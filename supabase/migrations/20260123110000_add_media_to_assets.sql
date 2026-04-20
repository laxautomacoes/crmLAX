-- Add videos and documents columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS videos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';

-- Create property-properties bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-properties', 'property-properties', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage
CREATE POLICY "Property properties are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'property-properties' );

CREATE POLICY "Authenticated users can upload property properties"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'property-properties' AND auth.role() = 'authenticated' );

CREATE POLICY "Users can update their own property properties"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'property-properties' AND auth.uid() = owner )
  WITH CHECK ( bucket_id = 'property-properties' AND auth.uid() = owner );

CREATE POLICY "Users can delete their own property properties"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'property-properties' AND auth.uid() = owner );
