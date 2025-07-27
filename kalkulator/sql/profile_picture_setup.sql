-- Profile Picture Feature Database Setup
-- Run these SQL statements in your Supabase SQL editor

-- 1. Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true);

-- 2. Set up Row Level Security (RLS) policies for the profile-pictures bucket

-- Policy: Users can upload their own profile pictures
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own profile pictures
CREATE POLICY "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view profile pictures (public read access)
CREATE POLICY "Anyone can view profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- 3. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Add profile_picture_url column to user_settings table (if it doesn't exist)
-- This will store the URL/path to the user's profile picture
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'profile_picture_url'
    ) THEN
        ALTER TABLE user_settings 
        ADD COLUMN profile_picture_url TEXT;
    END IF;
END $$;

-- 5. Create an index on profile_picture_url for better query performance
CREATE INDEX IF NOT EXISTS idx_user_settings_profile_picture_url 
ON user_settings(profile_picture_url);

-- 6. Optional: Add a function to clean up orphaned profile pictures
-- This function can be called periodically to remove profile pictures 
-- that are no longer referenced by any user
CREATE OR REPLACE FUNCTION cleanup_orphaned_profile_pictures()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    pic_record RECORD;
BEGIN
    -- Find profile pictures in storage that are not referenced in user_settings
    FOR pic_record IN 
        SELECT name FROM storage.objects 
        WHERE bucket_id = 'profile-pictures'
        AND name NOT IN (
            SELECT SUBSTRING(profile_picture_url FROM '[^/]+$') 
            FROM user_settings 
            WHERE profile_picture_url IS NOT NULL
            AND profile_picture_url LIKE '%profile-pictures%'
        )
    LOOP
        -- Delete the orphaned file
        DELETE FROM storage.objects 
        WHERE bucket_id = 'profile-pictures' AND name = pic_record.name;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant necessary permissions
-- Grant usage on the cleanup function to authenticated users (optional)
GRANT EXECUTE ON FUNCTION cleanup_orphaned_profile_pictures() TO authenticated;

-- Note: After running these statements, you should verify:
-- 1. The 'profile-pictures' bucket exists in Storage
-- 2. The RLS policies are active
-- 3. The profile_picture_url column exists in user_settings table
-- 4. Test upload/download permissions work correctly

-- Example test queries (run after setup):
-- Check if bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'profile-pictures';

-- Check if column was added:
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'user_settings' AND column_name = 'profile_picture_url';

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
