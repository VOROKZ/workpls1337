/*
  # Create storage buckets for file uploads

  1. blog-images — public bucket for influencer blog post photos
  2. hotel-images — public bucket for hotel room and profile photos
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('blog-images', 'blog-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('hotel-images', 'hotel-images', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Blog images: authenticated users can upload their own files
CREATE POLICY "Influencers can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Anyone can view blog images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'blog-images');

CREATE POLICY "Owners can delete own blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Hotel images: authenticated hotel owners can upload
CREATE POLICY "Hotels can upload hotel images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'hotel-images');

CREATE POLICY "Anyone can view hotel images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'hotel-images');

CREATE POLICY "Owners can delete own hotel images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'hotel-images' AND auth.uid()::text = (storage.foldername(name))[1]);
