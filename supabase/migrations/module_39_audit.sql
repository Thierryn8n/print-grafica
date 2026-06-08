-- MÓDULO 39 - AUDITORIA COMPLETA
-- Log de todas as ações, rastreabilidade, relatórios de auditoria, export de logs

-- A tabela audit_logs já existe (MÓDULO 17), vamos expandir

-- Adicionar campos adicionais para auditoria completa
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Criar tabela de sessões para rastreabilidade
CREATE TABLE IF NOT EXISTS audit_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  action_count INTEGER DEFAULT 0
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_agent ON audit_logs(user_agent);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_user_id ON audit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_sessions_session_id ON audit_sessions(session_id);

-- Criar função para rastrear sessão
CREATE OR REPLACE FUNCTION track_audit_session()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_sessions (user_id, session_id, ip_address, user_agent)
    VALUES (NEW.user_id, NEW.session_id, NEW.ip_address, NEW.user_agent)
    ON CONFLICT (session_id) DO UPDATE SET
      action_count = audit_sessions.action_count + 1,
      ended_at = NOW();
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para rastrear sessão
DROP TRIGGER IF EXISTS trigger_track_audit_session ON audit_logs;
CREATE TRIGGER trigger_track_audit_session
  AFTER INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION track_audit_session();

-- Criar view para relatório de auditoria
CREATE OR REPLACE VIEW audit_report AS
SELECT 
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.user_id,
  p.full_name as user_name,
  p.email as user_email,
  p.role as user_role,
  al.old_values,
  al.new_values,
  al.changed_fields,
  al.session_id,
  al.request_id,
  al.ip_address,
  al.user_agent,
  al.metadata,
  al.created_at
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

-- Criar função para exportar logs
CREATE OR REPLACE FUNCTION export_audit_logs(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_table_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  user_id UUID,
  user_name TEXT,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.user_id,
    p.full_name as user_name,
    al.old_values,
    al.new_values,
    al.changed_fields,
    al.ip_address,
    al.created_at
  FROM audit_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE 
    (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS para audit_sessions
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit sessions" ON audit_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "System can insert audit sessions" ON audit_sessions FOR INSERT WITH CHECK (true);
