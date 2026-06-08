-- Aprovar primeiro admin manualmente
-- Execute este arquivo no SQL Editor do Supabase

-- Atualizar status do usuário para approved
UPDATE profiles 
SET status = 'approved' 
WHERE role = 'admin' AND status = 'pending';

-- Verificar se foi atualizado
SELECT id, email, full_name, role, status FROM profiles WHERE role = 'admin';
