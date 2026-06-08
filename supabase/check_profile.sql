-- Verificar se o perfil existe
SELECT * FROM profiles WHERE id = '91d10900-1e0b-4af3-98bd-1c3a208e922b';

-- Verificar todos os perfis
SELECT id, email, full_name, role, status FROM profiles;
