-- ============================================
-- SETUP COMPLETO DO SUPABASE
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHEMA PRINCIPAL (se já existe, pule)
-- ============================================

-- Tabelas principais já devem existir (schema.sql)
-- Se não existirem, execute o schema.sql primeiro

-- ============================================
-- SISTEMA DE CORES PARA SUBLIMAÇÃO
-- ============================================

-- Tabela de bibliotecas de cores
CREATE TABLE IF NOT EXISTS color_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de tipos de tecido
CREATE TABLE IF NOT EXISTS fabric_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Tabela de cores originais
CREATE TABLE IF NOT EXISTS original_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  library_id UUID REFERENCES color_libraries(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT,
  pantone_code TEXT,
  corel_code TEXT,
  rgb_r INTEGER NOT NULL CHECK (rgb_r >= 0 AND rgb_r <= 255),
  rgb_g INTEGER NOT NULL CHECK (rgb_g >= 0 AND rgb_g <= 255),
  rgb_b INTEGER NOT NULL CHECK (rgb_b >= 0 AND rgb_b <= 255),
  hex TEXT NOT NULL,
  lab_l NUMERIC,
  lab_a NUMERIC,
  lab_b NUMERIC,
  page_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de amostras de cores sublimadas
CREATE TABLE IF NOT EXISTS sublimated_color_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_color_id UUID REFERENCES original_colors(id) ON DELETE CASCADE,
  fabric_type_id TEXT REFERENCES fabric_types(id),
  scanned_image_url TEXT,
  sample_crop_url TEXT,
  measured_rgb_r INTEGER CHECK (measured_rgb_r >= 0 AND measured_rgb_r <= 255),
  measured_rgb_g INTEGER CHECK (measured_rgb_g >= 0 AND measured_rgb_g <= 255),
  measured_rgb_b INTEGER CHECK (measured_rgb_b >= 0 AND measured_rgb_b <= 255),
  measured_hex TEXT,
  measured_lab_l NUMERIC,
  measured_lab_a NUMERIC,
  measured_lab_b NUMERIC,
  printer_model TEXT,
  ink_type TEXT,
  paper_type TEXT,
  temperature NUMERIC,
  press_time_seconds INTEGER,
  pressure_level TEXT,
  scan_device TEXT,
  scan_dpi INTEGER,
  lighting_condition TEXT,
  notes TEXT,
  calibration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de análises de cores de clientes
CREATE TABLE IF NOT EXISTS customer_color_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  uploaded_image_url TEXT NOT NULL,
  selected_fabric_mode TEXT NOT NULL CHECK (selected_fabric_mode IN ('dry-fit', 'helanca', 'both')),
  number_of_colors INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de cores detectadas em imagens
CREATE TABLE IF NOT EXISTS detected_image_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES customer_color_analyses(id) ON DELETE CASCADE,
  color_index INTEGER NOT NULL,
  detected_rgb_r INTEGER NOT NULL,
  detected_rgb_g INTEGER NOT NULL,
  detected_rgb_b INTEGER NOT NULL,
  detected_hex TEXT NOT NULL,
  detected_lab_l NUMERIC,
  detected_lab_a NUMERIC,
  detected_lab_b NUMERIC,
  percentage_in_image NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de recomendações de cores
CREATE TABLE IF NOT EXISTS color_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES customer_color_analyses(id) ON DELETE CASCADE,
  detected_color_id UUID REFERENCES detected_image_colors(id) ON DELETE CASCADE,
  fabric_type_id TEXT REFERENCES fabric_types(id),
  recommended_original_color_id UUID REFERENCES original_colors(id),
  recommended_sublimated_sample_id UUID REFERENCES sublimated_color_samples(id),
  delta_e NUMERIC,
  match_percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Inserir tipos de tecido
INSERT INTO fabric_types (id, name, description) VALUES
  ('dry-fit', 'Dry-fit', 'Tecido dry-fit para sublimação'),
  ('helanca', 'Helanca', 'Tecido helanca para sublimação')
ON CONFLICT (id) DO NOTHING;

-- Inserir biblioteca de cores padrão
INSERT INTO color_libraries (name, description, source) VALUES
  ('CorelDRAW', 'Paleta de cores do CorelDRAW', 'CorelDRAW'),
  ('Pantone', 'Paleta de cores Pantone', 'Pantone')
ON CONFLICT DO NOTHING;

-- ============================================
-- HABILITAR RLS
-- ============================================

ALTER TABLE color_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE fabric_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE original_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sublimated_color_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_color_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_image_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE color_recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Políticas para color_libraries
CREATE POLICY "Public can read color libraries" ON color_libraries FOR SELECT USING (true);
CREATE POLICY "Admins can manage color libraries" ON color_libraries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- Políticas para fabric_types
CREATE POLICY "Public can read fabric types" ON fabric_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage fabric types" ON fabric_types FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- Políticas para original_colors
CREATE POLICY "Public can read original colors" ON original_colors FOR SELECT USING (true);
CREATE POLICY "Admins can manage original colors" ON original_colors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- Políticas para sublimated_color_samples
CREATE POLICY "Public can read sublimated samples" ON sublimated_color_samples FOR SELECT USING (true);
CREATE POLICY "Admins can manage sublimated samples" ON sublimated_color_samples FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- Políticas para customer_color_analyses
CREATE POLICY "Users can read their analyses" ON customer_color_analyses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = customer_color_analyses.order_id
    AND (
      o.client_id IN (SELECT id FROM clients WHERE created_by = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
    )
  )
);
CREATE POLICY "Admins and designers can manage analyses" ON customer_color_analyses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);

-- Políticas para detected_image_colors
CREATE POLICY "Users can read their detected colors" ON detected_image_colors FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customer_color_analyses a
    WHERE a.id = detected_image_colors.analysis_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = a.order_id
      AND (
        o.client_id IN (SELECT id FROM clients WHERE created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
      )
    )
  )
);
CREATE POLICY "Admins and designers can manage detected colors" ON detected_image_colors FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);

-- Políticas para color_recommendations
CREATE POLICY "Users can read their recommendations" ON color_recommendations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customer_color_analyses a
    WHERE a.id = color_recommendations.analysis_id
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = a.order_id
      AND (
        o.client_id IN (SELECT id FROM clients WHERE created_by = auth.uid())
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
      )
    )
  )
);
CREATE POLICY "Admins and designers can manage recommendations" ON color_recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Criar buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('customer-reference-images', 'customer-reference-images', true),
  ('scanned-color-charts', 'scanned-color-charts', false),
  ('color-sample-crops', 'color-sample-crops', false),
  ('analysis-results', 'analysis-results', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Políticas de storage
CREATE POLICY "Public can read customer reference images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'customer-reference-images');
CREATE POLICY "Admins and designers can upload customer reference images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'customer-reference-images' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);
CREATE POLICY "Admins and designers can delete customer reference images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'customer-reference-images' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);

CREATE POLICY "Admins can manage scanned color charts" ON storage.objects FOR ALL TO authenticated USING (
  bucket_id = 'scanned-color-charts' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Admins can manage color sample crops" ON storage.objects FOR ALL TO authenticated USING (
  bucket_id = 'color-sample-crops' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Public can read analysis results" ON storage.objects FOR SELECT TO public USING (bucket_id = 'analysis-results');
CREATE POLICY "Admins and designers can upload analysis results" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'analysis-results' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'designer') AND status = 'approved')
);
CREATE POLICY "Admins can delete analysis results" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'analysis-results' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar tabelas criadas
SELECT 'Tabelas de cores criadas:' as info;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%color%' ORDER BY table_name;

-- Verificar buckets criados
SELECT 'Storage buckets criados:' as info;
SELECT id, name, public FROM storage.buckets WHERE name LIKE '%color%';

-- ============================================
-- CONCLUÍDO
-- ============================================
SELECT 'Setup completo! Sistema de cores configurado.' as status;
