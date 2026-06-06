-- ============================================
-- SISTEMA DE AUDITORIA
-- Execute no SQL Editor do Supabase
-- ============================================

-- Tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can read audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND status = 'approved')
);

CREATE POLICY "Users can read their own audit logs" ON audit_logs FOR SELECT USING (
  user_id = auth.uid()
);

-- Função para registrar log de auditoria
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
  VALUES (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    inet_client_addr(),
    current_setting('request.headers.user-agent', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para registrar alterações em tabelas principais

-- Trigger para orders
CREATE OR REPLACE FUNCTION trigger_order_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'order', NEW.id::TEXT, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('UPDATE', 'order', NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'order', OLD.id::TEXT, to_jsonb(OLD), NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_audit_trigger ON orders;
CREATE TRIGGER order_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_order_audit();

-- Trigger para clients
CREATE OR REPLACE FUNCTION trigger_client_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'client', NEW.id::TEXT, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('UPDATE', 'client', NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'client', OLD.id::TEXT, to_jsonb(OLD), NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_audit_trigger ON clients;
CREATE TRIGGER client_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION trigger_client_audit();

-- Trigger para profiles
CREATE OR REPLACE FUNCTION trigger_profile_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit('INSERT', 'profile', NEW.id::TEXT, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('UPDATE', 'profile', NEW.id::TEXT, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit('DELETE', 'profile', OLD.id::TEXT, to_jsonb(OLD), NULL);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_audit_trigger ON profiles;
CREATE TRIGGER profile_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_profile_audit();

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 'Sistema de auditoria criado com sucesso!' as status;
