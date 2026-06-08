-- Desabilitar RLS temporariamente na tabela profiles para debug
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Tente fazer login novamente
-- Se funcionar, o problema está nas políticas RLS
