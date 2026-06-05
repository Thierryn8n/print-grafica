-- Sistema de Análise e Comparação de Cores para Sublimação
-- Schema SQL para Supabase

-- Habilitar extensão UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: color_libraries
-- Bibliotecas de cores (Pantone, Corel, etc)
CREATE TABLE IF NOT EXISTS color_libraries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  source TEXT, -- 'pantone', 'corel', 'custom', etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: fabric_types
-- Tipos de tecido (Dry-fit, Helanca, etc)
CREATE TABLE IF NOT EXISTS fabric_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: original_colors
-- Cores originais das tabelas (Corel/Pantone)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (library_id, code)
);

-- Tabela: sublimated_color_samples
-- Amostras de cores sublimadas (escaneadas)
CREATE TABLE IF NOT EXISTS sublimated_color_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_color_id UUID REFERENCES original_colors(id) ON DELETE CASCADE,
  fabric_type_id UUID REFERENCES fabric_types(id) ON DELETE CASCADE,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (original_color_id, fabric_type_id)
);

-- Tabela: customer_color_analyses
-- Análises de cores de imagens de clientes
CREATE TABLE IF NOT EXISTS customer_color_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  uploaded_image_url TEXT NOT NULL,
  selected_fabric_mode TEXT NOT NULL CHECK (selected_fabric_mode IN ('dry-fit', 'helanca', 'both')),
  number_of_colors INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela: detected_image_colors
-- Cores detectadas na imagem do cliente
CREATE TABLE IF NOT EXISTS detected_image_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES customer_color_analyses(id) ON DELETE CASCADE,
  color_index INTEGER NOT NULL,
  detected_rgb_r INTEGER NOT NULL CHECK (detected_rgb_r >= 0 AND detected_rgb_r <= 255),
  detected_rgb_g INTEGER NOT NULL CHECK (detected_rgb_g >= 0 AND detected_rgb_g <= 255),
  detected_rgb_b INTEGER NOT NULL CHECK (detected_rgb_b >= 0 AND detected_rgb_b <= 255),
  detected_hex TEXT NOT NULL,
  detected_lab_l NUMERIC,
  detected_lab_a NUMERIC,
  detected_lab_b NUMERIC,
  percentage_in_image NUMERIC CHECK (percentage_in_image >= 0 AND percentage_in_image <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (analysis_id, color_index)
);

-- Tabela: color_recommendations
-- Recomendações de cores para sublimação
CREATE TABLE IF NOT EXISTS color_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID REFERENCES customer_color_analyses(id) ON DELETE CASCADE,
  detected_color_id UUID REFERENCES detected_image_colors(id) ON DELETE CASCADE,
  fabric_type_id UUID REFERENCES fabric_types(id) ON DELETE CASCADE,
  recommended_original_color_id UUID REFERENCES original_colors(id) ON DELETE CASCADE,
  recommended_sublimated_sample_id UUID REFERENCES sublimated_color_samples(id) ON DELETE CASCADE,
  delta_e NUMERIC,
  match_percentage NUMERIC CHECK (match_percentage >= 0 AND match_percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (detected_color_id, fabric_type_id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_original_colors_library ON original_colors(library_id);
CREATE INDEX IF NOT EXISTS idx_original_colors_hex ON original_colors(hex);
CREATE INDEX IF NOT EXISTS idx_sublimated_samples_original ON sublimated_color_samples(original_color_id);
CREATE INDEX IF NOT EXISTS idx_sublimated_samples_fabric ON sublimated_color_samples(fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_analyses_order ON customer_color_analyses(order_id);
CREATE INDEX IF NOT EXISTS idx_detected_colors_analysis ON detected_image_colors(analysis_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_analysis ON color_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_detected ON color_recommendations(detected_color_id);

-- Inserir tipos de tecido iniciais
INSERT INTO fabric_types (name, description) VALUES
  ('Dry-fit', 'Tecido Dry-fit para sublimação'),
  ('Helanca', 'Tecido Helanca para sublimação')
ON CONFLICT (name) DO NOTHING;

-- Criar biblioteca de cores padrão (Pantone)
INSERT INTO color_libraries (name, description, source) VALUES
  ('Pantone Coated', 'Tabela Pantone Coated', 'pantone'),
  ('Corel Default', 'Paleta padrão do CorelDRAW', 'corel')
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_color_libraries_updated_at BEFORE UPDATE ON color_libraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fabric_types_updated_at BEFORE UPDATE ON fabric_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_original_colors_updated_at BEFORE UPDATE ON original_colors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sublimated_color_samples_updated_at BEFORE UPDATE ON sublimated_color_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_color_analyses_updated_at BEFORE UPDATE ON customer_color_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
