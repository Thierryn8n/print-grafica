-- ============================================
-- SISTEMA DE GESTÃO DE IMPRESSORAS
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela de impressoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  printer_type TEXT NOT NULL CHECK (printer_type IN ('sublimacao', 'dtf', 'uv', 'laser', 'inkjet')),
  status TEXT NOT NULL DEFAULT 'operacional' CHECK (status IN ('operacional', 'manutencao', 'inoperativo', 'retirado')),
  location TEXT,
  max_width_cm NUMERIC,
  max_height_cm NUMERIC,
  resolution_dpi INTEGER,
  ink_type TEXT,
  purchase_date DATE,
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de manutenções
CREATE TABLE IF NOT EXISTS printer_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  printer_id UUID REFERENCES printers(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventiva', 'corretiva', 'limpeza', 'calibracao', 'troca_componente')),
  description TEXT,
  scheduled_date DATE,
  performed_date DATE,
  performed_by UUID REFERENCES profiles(id),
  cost NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de histórico de impressões
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  printer_id UUID REFERENCES printers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  job_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  print_area_width_cm NUMERIC,
  print_area_height_cm NUMERIC,
  ink_consumption TEXT,
  print_duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'imprimindo', 'concluida', 'falha', 'cancelada')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status);
CREATE INDEX IF NOT EXISTS idx_printer_maintenance_printer ON printer_maintenance(printer_id);
CREATE INDEX IF NOT EXISTS idx_printer_maintenance_date ON printer_maintenance(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_order ON print_jobs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_date ON print_jobs(created_at);

-- Habilitar RLS
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage printers" ON printers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read printers" ON printers FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

CREATE POLICY "Admins can manage printer maintenance" ON printer_maintenance FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read printer maintenance" ON printer_maintenance FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

CREATE POLICY "Admins can manage print jobs" ON print_jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read print jobs" ON print_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

CREATE POLICY "Designers can create print jobs" ON print_jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Sistema de impressoras criado com sucesso!' as status;
