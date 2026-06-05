-- Remover políticas antigas e conflitantes
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Manter apenas as políticas corretas
-- (as políticas já foram criadas no schema_fixes.sql)
