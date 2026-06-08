-- ============================================
-- SISTEMA DE GESTÃO DE ESTOQUE
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela de categorias de materiais
CREATE TABLE IF NOT EXISTS material_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Tabela de materiais
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT REFERENCES material_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL CHECK (unit IN ('un', 'kg', 'm', 'l', 'cx', 'rolo')),
  min_stock_level INTEGER NOT NULL DEFAULT 0,
  max_stock_level INTEGER NOT NULL DEFAULT 100,
  cost_per_unit NUMERIC(10, 2),
  supplier TEXT,
  supplier_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de movimentação de estoque
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste', 'devolucao')),
  quantity INTEGER NOT NULL,
  reason TEXT,
  order_id UUID REFERENCES orders(id),
  performed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de alertas de estoque
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
  current_quantity INTEGER NOT NULL,
  threshold_level INTEGER NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_material ON inventory_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_material ON stock_alerts(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON stock_alerts(resolved);

-- Habilitar RLS
ALTER TABLE material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage material categories" ON material_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Public can read material categories" ON material_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage materials" ON materials FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read materials" ON materials FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

CREATE POLICY "Admins can manage inventory movements" ON inventory_movements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read inventory movements" ON inventory_movements FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

CREATE POLICY "Admins can manage stock alerts" ON stock_alerts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read stock alerts" ON stock_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

-- Dados iniciais de categorias
INSERT INTO material_categories (id, name, description) VALUES
  ('camisetas', 'Camisetas', 'Camisetas em diversos tamanhos'),
  ('tintas', 'Tintas', 'Tintas para sublimação'),
  ('papeis', 'Papéis', 'Papéis de transferência'),
  ('outros', 'Outros', 'Outros materiais')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Sistema de estoque criado com sucesso!' as status;
