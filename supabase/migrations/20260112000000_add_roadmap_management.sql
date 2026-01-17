-- Add Super Admin management policies for updates table
-- This allows superadmins to create, update and delete roadmap entries

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'updates' AND policyname = 'Super Admins can manage updates'
    ) THEN
        CREATE POLICY "Super Admins can manage updates" ON public.updates
          FOR ALL TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'superadmin'
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'superadmin'
            )
          );
    END IF;
END $$;
