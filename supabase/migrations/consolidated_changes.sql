-- CONSOLIDATED MIGRATION - Todas as mudanças implementadas no checklist
-- Este arquivo contém todas as alterações SQL necessárias para aplicar
-- as funcionalidades implementadas nos MÓDULOS 1-20

-- ============================================================
-- MÓDULO 1 - GESTÃO DE PEDIDOS AVANÇADA
-- ============================================================

-- Adicionar campos de custo e lucro na tabela orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS custo_total NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lucro_estimado NUMERIC;

-- ============================================================
-- MÓDULO 3 - UNIFORMES ESPORTIVOS
-- ============================================================

-- Adicionar campos específicos para uniformes esportivos
ALTER TABLE form_participants ADD COLUMN IF NOT EXISTS sport_type TEXT;
ALTER TABLE form_participants ADD COLUMN IF NOT EXISTS sport_data JSONB;

-- ============================================================
-- MÓDULO 15 - MULTIEMPRESA (SAAS)
-- ============================================================

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Adicionar company_id às tabelas principais
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE order_files ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================
-- MÓDULO 17 - BANCO DE DADOS (Soft Delete)
-- ============================================================

-- Adicionar deleted_at para soft delete
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE order_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE digital_assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- MÓDULO 17 - BANCO DE DADOS (Auditoria Avançada)
-- ============================================================

-- Criar tabela de audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES profiles(id),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar função de trigger de auditoria
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      auth.uid(),
      NULL,
      to_jsonb(NEW),
      NULL,
      NULL,
      NULL
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(key) INTO changed_fields
    FROM (
      SELECT key
      FROM jsonb_each(to_jsonb(OLD))
      WHERE to_jsonb(OLD)->>key IS DISTINCT FROM to_jsonb(NEW)->>key
    ) t;
    
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        user_id,
        old_values,
        new_values,
        changed_fields,
        ip_address,
        user_agent
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        'UPDATE',
        auth.uid(),
        to_jsonb(OLD),
        to_jsonb(NEW),
        changed_fields,
        NULL,
        NULL
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      user_id,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD),
      NULL,
      NULL,
      NULL,
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers de auditoria
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================
-- MÓDULO 19 - SEGURANÇA (Auditoria de Acessos)
-- ============================================================

-- Criar tabela de access_logs
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'PROFILE_UPDATE')),
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MÓDULO 19 - SEGURANÇA (IP Whitelist)
-- ============================================================

-- Criar tabela de ip_whitelist
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  cidr TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, ip_address)
);

-- ============================================================
-- RLS POLICIES - Atualizações
-- ============================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Atualizar policies para filtrar deleted_at
DROP POLICY IF EXISTS "Authenticated users can view orders" ON orders;
CREATE POLICY "Authenticated users can view orders" 
  ON orders FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can view clients" ON clients;
CREATE POLICY "Authenticated users can view clients" 
  ON clients FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Authenticated users can view digital_assets" ON digital_assets;
CREATE POLICY "Authenticated users can view digital_assets" 
  ON digital_assets FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Authenticated users can view order files" ON order_files;
CREATE POLICY "Authenticated users can view order files" 
  ON order_files FOR SELECT 
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- Policies para audit_logs
CREATE POLICY "Admins can view audit logs" 
  ON audit_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- Policies para access_logs
CREATE POLICY "Admins can view access logs" 
  ON access_logs FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Users can view their own access logs" 
  ON access_logs FOR SELECT 
  USING (auth.uid() = user_id);

-- Policies para ip_whitelist
CREATE POLICY "Admins can view ip whitelist" 
  ON ip_whitelist FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can insert ip whitelist" 
  ON ip_whitelist FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can delete ip whitelist" 
  ON ip_whitelist FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- ============================================================
-- INDEXES - Performance
-- ============================================================

-- Criar indexes para performance
CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_deadline ON orders(deadline);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_order_id ON activity_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_digital_assets_company_id ON digital_assets(company_id);

-- ============================================================
-- FIM DO CONSOLIDATED MIGRATION
-- ============================================================
