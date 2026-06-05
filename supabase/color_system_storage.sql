-- Criar Storage Buckets para Sistema de Cores
-- Execute no SQL Editor do Supabase

-- Bucket para imagens de referência de clientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-reference-images', 'customer-reference-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket para tabelas de cores escaneadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('scanned-color-charts', 'scanned-color-charts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Bucket para recortes de amostras de cores
INSERT INTO storage.buckets (id, name, public)
VALUES ('color-sample-crops', 'color-sample-crops', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Bucket para resultados de análises
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-results', 'analysis-results', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas RLS para Storage Buckets

-- Políticas para customer-reference-images
CREATE POLICY "Public can read customer reference images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'customer-reference-images');

CREATE POLICY "Admins and designers can upload customer reference images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'customer-reference-images' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins and designers can delete customer reference images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'customer-reference-images' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

-- Políticas para scanned-color-charts (apenas admin)
CREATE POLICY "Admins can read scanned color charts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'scanned-color-charts' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can upload scanned color charts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'scanned-color-charts' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete scanned color charts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'scanned-color-charts' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para color-sample-crops (apenas admin)
CREATE POLICY "Admins can read color sample crops"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'color-sample-crops' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can upload color sample crops"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'color-sample-crops' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete color sample crops"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'color-sample-crops' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Políticas para analysis-results (público leitura, admin escrita)
CREATE POLICY "Public can read analysis results"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'analysis-results');

CREATE POLICY "Admins and designers can upload analysis results"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'analysis-results' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete analysis results"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'analysis-results' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );
