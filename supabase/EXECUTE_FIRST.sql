-- ============================================
-- EXECUTE ESTE ARQUIVO PRIMEIRO NO SUPABASE
-- ============================================
-- Este arquivo contém todos os SQL necessários
-- para configurar o sistema de cores e o banco de dados
-- ============================================

-- Execute na seguinte ordem:
-- 1. schema.sql (já deve estar executado)
-- 2. color_system_schema.sql
-- 3. color_system_rls.sql
-- 4. color_system_storage.sql

-- Se já executou o schema.sql, pule para o próximo
-- Se não, execute: \i schema.sql

-- ============================================
-- SISTEMA DE CORES PARA SUBLIMAÇÃO
-- ============================================

-- Execute: \i color_system_schema.sql
-- Execute: \i color_system_rls.sql
-- Execute: \i color_system_storage.sql

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%color%'
ORDER BY table_name;

-- Verificar se os buckets foram criados
SELECT id, name, public 
FROM storage.buckets 
WHERE name LIKE '%color%';

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================
-- Após executar todos os SQLs:
-- 1. Acesse /admin/cores para cadastrar amostras
-- 2. Teste a análise de cores na página de novo pedido
-- 3. Teste a análise de cores no kanban do designer
