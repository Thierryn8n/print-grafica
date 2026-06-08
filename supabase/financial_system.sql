-- ============================================
-- SISTEMA DE GESTÃO FINANCEIRA
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'material', 'equipamento', 'servico', 'folha', 'aluguel', 
    'energia', 'internet', 'outros'
  )),
  expense_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN (
    'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'boleto'
  )),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de receitas
CREATE TABLE IF NOT EXISTS revenues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'venda', 'servico', 'outros'
  )),
  revenue_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN (
    'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'transferencia', 'boleto'
  )),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'recebido', 'cancelado')),
  due_date DATE,
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de orçamentos
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_budget NUMERIC(10, 2) NOT NULL,
  material_budget NUMERIC(10, 2),
  equipment_budget NUMERIC(10, 2),
  service_budget NUMERIC(10, 2),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_revenues_date ON revenues(revenue_date);
CREATE INDEX IF NOT EXISTS idx_revenues_status ON revenues(status);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);

-- Habilitar RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para expenses
CREATE POLICY "Admins can manage expenses" ON expenses FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read expenses" ON expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

-- Políticas RLS para revenues
CREATE POLICY "Admins can manage revenues" ON revenues FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read revenues" ON revenues FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

-- Políticas RLS para budgets
CREATE POLICY "Admins can manage budgets" ON budgets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Designers can read budgets" ON budgets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'designer' AND status = 'approved')
);

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Sistema financeiro criado com sucesso!' as status;
