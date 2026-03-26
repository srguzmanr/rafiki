-- Migration: Add Supabase Storage policies for the sorteo-images bucket.
--
-- The "sorteo-images" bucket is created manually in Supabase Dashboard
-- with public read enabled. This migration adds the RLS policies needed
-- for authenticated users to upload/manage files in the bucket.
--
-- Without these policies, uploads silently fail with 403/401 errors.

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload sorteo images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sorteo-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update sorteo images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sorteo-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete sorteo images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sorteo-images');

-- Allow anyone to read images (bucket is public, but policy is still needed)
CREATE POLICY "Anyone can read sorteo images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'sorteo-images');
