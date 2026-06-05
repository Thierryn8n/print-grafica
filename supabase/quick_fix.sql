-- Solução rápida: desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Após fazer login com sucesso, reabilitaremos com políticas simples
