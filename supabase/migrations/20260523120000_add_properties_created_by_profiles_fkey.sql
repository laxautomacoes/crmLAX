-- Add foreign key constraint between properties and profiles
ALTER TABLE properties
ADD CONSTRAINT properties_created_by_profiles_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;
