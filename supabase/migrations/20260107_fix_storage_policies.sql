-- Fix Storage Policies for Profile Photos
-- Note: This assumes the bucket 'profile-photos' already exists.

-- Remove existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1u505w_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1u505w_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1u505w_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1u505w_3" ON storage.objects;

-- Policy 1: Public Read Access
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'profile-photos' );

-- Policy 2: Authenticated Upload (Insert)
-- Check if the user is authenticated and the path starts with their user ID
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Authenticated Update
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Authenticated Delete
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);