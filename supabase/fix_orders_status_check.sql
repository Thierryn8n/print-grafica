-- ============================================================================
-- Alinha o CHECK constraint da coluna orders.status ao fluxo usado no aplicativo
-- ----------------------------------------------------------------------------
-- Motivo: o schema original definia 'aprovado-cliente', porém todo o código
-- (store, rastreio público, página de aprovação e Kanban) usa 'aprovado'.
-- Isso impedia mover/gravar pedidos com status 'aprovado'.
--
-- Seguro para rodar a qualquer momento. Execute no SQL Editor do Supabase.
-- ============================================================================

-- 1) Migra registros que ainda usem o valor antigo
UPDATE public.orders
SET status = 'aprovado'
WHERE status = 'aprovado-cliente';

-- 2) Remove qualquer CHECK existente que referencie a coluna status
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class t ON t.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 3) Recria o CHECK com o conjunto de status canônico do app
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'novo-pedido', 'aguardando-info', 'em-criacao', 'revisao-interna',
    'mockup-pronto', 'enviado-aprovacao', 'aprovado', 'ajustes-solicitados',
    'arte-finalizada', 'enviado-producao', 'sublimacao', 'finalizado', 'entregue'
  ));
