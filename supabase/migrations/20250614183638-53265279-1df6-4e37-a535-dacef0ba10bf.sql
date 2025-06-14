
-- Create or update the storage bucket for cluster images with specific limits.
-- This operation is idempotent and won't cause an error if the bucket already exists.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cluster-images', 'cluster-images', true, 512000, ARRAY['image/*'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public, 
    file_size_limit = EXCLUDED.file_size_limit, 
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies to ensure a clean setup.
DROP POLICY IF EXISTS "Public read access for cluster images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload cluster images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own cluster images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own cluster images" ON storage.objects;

-- Create new policies for the 'cluster-images' bucket.
-- 1. Allow public read access so images can be displayed in the app.
CREATE POLICY "Public read access for cluster images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'cluster-images' );

-- 2. Allow authenticated (logged-in) users to upload images.
CREATE POLICY "Authenticated users can upload cluster images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'cluster-images' );

-- 3. Allow users to update their own images (e.g., metadata).
CREATE POLICY "Users can update their own cluster images"
ON storage.objects FOR UPDATE
USING ( auth.uid() = owner AND bucket_id = 'cluster-images' );

-- 4. Allow users to delete their own images from storage.
CREATE POLICY "Users can delete their own cluster images"
ON storage.objects FOR DELETE
USING ( auth.uid() = owner AND bucket_id = 'cluster-images' );
