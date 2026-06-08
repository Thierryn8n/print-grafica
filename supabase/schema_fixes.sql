-- Correções para o schema - Execute apenas este arquivo
-- Este arquivo contém apenas as correções necessárias

-- Remover o trigger temporariamente para permitir cadastro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Adicionar política para permitir inserção de profiles pelo trigger
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (true);

-- Adicionar política para permitir consulta pública de contagem de admins
DROP POLICY IF EXISTS "Public can count admins" ON profiles;
CREATE POLICY "Public can count admins" 
  ON profiles FOR SELECT 
  USING (
    role = 'admin' AND status IN ('approved', 'pending')
  );

-- Adicionar política para permitir que usuários autenticados insiram seu próprio perfil
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Adicionar política para permitir que usuários leiam seu próprio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);
