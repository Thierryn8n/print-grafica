-- Supabase Storage Buckets for PrintFlow Studio
-- Execute this in Supabase SQL Editor
-- Note: Supabase Storage is a native service, no extension needed

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('fabrics', 'fabrics', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('shirt-types', 'shirt-types', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('short-types', 'short-types', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('form-concepts', 'form-concepts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for fabrics bucket
CREATE POLICY "Public can view fabrics images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'fabrics');

CREATE POLICY "Admins can upload fabrics images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fabrics' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete fabrics images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fabrics' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create storage policies for shirt-types bucket
CREATE POLICY "Public can view shirt-types images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'shirt-types');

CREATE POLICY "Admins can upload shirt-types images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shirt-types' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete shirt-types images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shirt-types' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create storage policies for short-types bucket
CREATE POLICY "Public can view short-types images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'short-types');

CREATE POLICY "Admins can upload short-types images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'short-types' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete short-types images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'short-types' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Create storage policies for form-concepts bucket
CREATE POLICY "Public can view form-concepts images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'form-concepts');

CREATE POLICY "Public can upload form-concepts images"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'form-concepts');

CREATE POLICY "Admins can delete form-concepts images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'form-concepts' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );
