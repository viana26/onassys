-- =====================================================
-- RLS: Habilitar SELECT nas tabelas lookup
-- Resolve o bug "?(id)" que aparece quando unidadeSigla()
-- não encontra a unidade porque a query retorna vazio.
-- =====================================================

-- UNIDADES
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unidades_select" ON public.unidades;
CREATE POLICY "unidades_select" ON public.unidades FOR SELECT TO authenticated USING (true);

-- CATEGORIAS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_select" ON public.categorias;
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT TO authenticated USING (true);

-- STATUS PEDIDO
ALTER TABLE public.status_pedido ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_pedido_select" ON public.status_pedido;
CREATE POLICY "status_pedido_select" ON public.status_pedido FOR SELECT TO authenticated USING (true);

-- TIPOS MOVIMENTACAO
ALTER TABLE public.tipos_movimentacao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_movimentacao_select" ON public.tipos_movimentacao;
CREATE POLICY "tipos_movimentacao_select" ON public.tipos_movimentacao FOR SELECT TO authenticated USING (true);

-- TIPOS CLIENTE
ALTER TABLE public.tipos_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_cliente_select" ON public.tipos_cliente;
CREATE POLICY "tipos_cliente_select" ON public.tipos_cliente FOR SELECT TO authenticated USING (true);

-- FORNECEDORES
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fornecedores_select" ON public.fornecedores;
CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated USING (true);

-- PERMISSOES
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissoes_select" ON public.permissoes;
CREATE POLICY "permissoes_select" ON public.permissoes FOR SELECT TO authenticated USING (true);

-- PERFIS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (true);

-- PERFIS PERMISSOES
ALTER TABLE public.perfis_permissoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfis_permissoes_select" ON public.perfis_permissoes;
CREATE POLICY "perfis_permissoes_select" ON public.perfis_permissoes FOR SELECT TO authenticated USING (true);

-- CATEGORIAS FINANCEIRO
ALTER TABLE public.categorias_financeiro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "categorias_financeiro_select" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_select" ON public.categorias_financeiro FOR SELECT TO authenticated USING (true);
