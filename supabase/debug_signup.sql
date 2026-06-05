-- Debug para verificar o problema de signup
-- Execute este arquivo para diagnosticar o problema

-- Verificar se a tabela profiles existe
SELECT COUNT(*) as profiles_count FROM profiles;

-- Verificar se o trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Verificar as políticas RLS da tabela profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- Verificar se RLS está habilitado na tabela profiles
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'profiles';

-- Tente inserir um perfil manualmente para testar
-- (descomente para testar)
-- INSERT INTO profiles (id, email, full_name, phone, role, status)
-- VALUES ('test-id', 'test@example.com', 'Test User', '1234567890', 'admin', 'pending');
