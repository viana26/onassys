-- Migration: 20260622000002_data_tables_setup.sql
-- Adiciona RLS e permissões para tabelas de dados
-- Criado em: 2026-06-22

-- =====================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICIES PARA MATERIAIS
-- =====================================================
DROP POLICY IF EXISTS "Materiais são visíveis para todos" ON public.materiais;
CREATE POLICY "Materiais são visíveis para todos"
    ON public.materiais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Materiais podem ser inseridos por todos" ON public.materiais;
CREATE POLICY "Materiais podem ser inseridos por todos"
    ON public.materiais FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Materiais podem ser atualizados por todos" ON public.materiais;
CREATE POLICY "Materiais podem ser atualizados por todos"
    ON public.materiais FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Materiais podem ser deletados por todos" ON public.materiais;
CREATE POLICY "Materiais podem ser deletados por todos"
    ON public.materiais FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "Produtos são visíveis para todos" ON public.produtos;
CREATE POLICY "Produtos são visíveis para todos"
    ON public.produtos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Produtos podem ser inseridos por todos" ON public.produtos;
CREATE POLICY "Produtos podem ser inseridos por todos"
    ON public.produtos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Produtos podem ser atualizados por todos" ON public.produtos;
CREATE POLICY "Produtos podem ser atualizados por todos"
    ON public.produtos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Produtos podem ser deletados por todos" ON public.produtos;
CREATE POLICY "Produtos podem ser deletados por todos"
    ON public.produtos FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA FICHAS TÉCNICAS
-- =====================================================
DROP POLICY IF EXISTS "Fichas técnicas são visíveis para todos" ON public.fichas_tecnicas;
CREATE POLICY "Fichas técnicas são visíveis para todos"
    ON public.fichas_tecnicas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Fichas técnicas podem ser inseridas por todos" ON public.fichas_tecnicas;
CREATE POLICY "Fichas técnicas podem ser inseridas por todos"
    ON public.fichas_tecnicas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Fichas técnicas podem ser atualizadas por todos" ON public.fichas_tecnicas;
CREATE POLICY "Fichas técnicas podem ser atualizadas por todos"
    ON public.fichas_tecnicas FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Fichas técnicas podem ser deletadas por todos" ON public.fichas_tecnicas;
CREATE POLICY "Fichas técnicas podem ser deletadas por todos"
    ON public.fichas_tecnicas FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA ESTOQUE PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "Estoque produtos é visível para todos" ON public.estoque_produtos;
CREATE POLICY "Estoque produtos é visível para todos"
    ON public.estoque_produtos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Estoque produtos pode ser inserido por todos" ON public.estoque_produtos;
CREATE POLICY "Estoque produtos pode ser inserido por todos"
    ON public.estoque_produtos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Estoque produtos pode ser atualizado por todos" ON public.estoque_produtos;
CREATE POLICY "Estoque produtos pode ser atualizado por todos"
    ON public.estoque_produtos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Estoque produtos pode ser deletado por todos" ON public.estoque_produtos;
CREATE POLICY "Estoque produtos pode ser deletado por todos"
    ON public.estoque_produtos FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA MOVIMENTACOES PRODUTOS
-- =====================================================
DROP POLICY IF EXISTS "Movimentações produtos são visíveis para todos" ON public.movimentacoes_produtos;
CREATE POLICY "Movimentações produtos são visíveis para todos"
    ON public.movimentacoes_produtos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Movimentações produtos podem ser inseridas por todos" ON public.movimentacoes_produtos;
CREATE POLICY "Movimentações produtos podem ser inseridas por todos"
    ON public.movimentacoes_produtos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Movimentações produtos podem ser atualizadas por todos" ON public.movimentacoes_produtos;
CREATE POLICY "Movimentações produtos podem ser atualizadas por todos"
    ON public.movimentacoes_produtos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Movimentações produtos podem ser deletadas por todos" ON public.movimentacoes_produtos;
CREATE POLICY "Movimentações produtos podem ser deletadas por todos"
    ON public.movimentacoes_produtos FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA MOVIMENTACOES MATERIAIS
-- =====================================================
DROP POLICY IF EXISTS "Movimentações materiais são visíveis para todos" ON public.movimentacoes_materiais;
CREATE POLICY "Movimentações materiais são visíveis para todos"
    ON public.movimentacoes_materiais FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Movimentações materiais podem ser inseridas por todos" ON public.movimentacoes_materiais;
CREATE POLICY "Movimentações materiais podem ser inseridas por todos"
    ON public.movimentacoes_materiais FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Movimentações materiais podem ser atualizadas por todos" ON public.movimentacoes_materiais;
CREATE POLICY "Movimentações materiais podem ser atualizadas por todos"
    ON public.movimentacoes_materiais FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Movimentações materiais podem ser deletadas por todos" ON public.movimentacoes_materiais;
CREATE POLICY "Movimentações materiais podem ser deletadas por todos"
    ON public.movimentacoes_materiais FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA CLIENTES
-- =====================================================
DROP POLICY IF EXISTS "Clientes são visíveis para todos" ON public.clientes;
CREATE POLICY "Clientes são visíveis para todos"
    ON public.clientes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Clientes podem ser inseridos por todos" ON public.clientes;
CREATE POLICY "Clientes podem ser inseridos por todos"
    ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Clientes podem ser atualizados por todos" ON public.clientes;
CREATE POLICY "Clientes podem ser atualizados por todos"
    ON public.clientes FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Clientes podem ser deletados por todos" ON public.clientes;
CREATE POLICY "Clientes podem ser deletados por todos"
    ON public.clientes FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA PEDIDOS
-- =====================================================
DROP POLICY IF EXISTS "Pedidos são visíveis para todos" ON public.pedidos;
CREATE POLICY "Pedidos são visíveis para todos"
    ON public.pedidos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pedidos podem ser inseridos por todos" ON public.pedidos;
CREATE POLICY "Pedidos podem ser inseridos por todos"
    ON public.pedidos FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Pedidos podem ser atualizados por todos" ON public.pedidos;
CREATE POLICY "Pedidos podem ser atualizados por todos"
    ON public.pedidos FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Pedidos podem ser deletados por todos" ON public.pedidos;
CREATE POLICY "Pedidos podem ser deletados por todos"
    ON public.pedidos FOR DELETE TO authenticated USING (true);

-- =====================================================
-- POLICIES PARA ITENS PEDIDO
-- =====================================================
DROP POLICY IF EXISTS "Itens pedido são visíveis para todos" ON public.itens_pedido;
CREATE POLICY "Itens pedido são visíveis para todos"
    ON public.itens_pedido FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Itens pedido podem ser inseridos por todos" ON public.itens_pedido;
CREATE POLICY "Itens pedido podem ser inseridos por todos"
    ON public.itens_pedido FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Itens pedido podem ser atualizados por todos" ON public.itens_pedido;
CREATE POLICY "Itens pedido podem ser atualizados por todos"
    ON public.itens_pedido FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Itens pedido podem ser deletados por todos" ON public.itens_pedido;
CREATE POLICY "Itens pedido podem ser deletados por todos"
    ON public.itens_pedido FOR DELETE TO authenticated USING (true);

-- =====================================================
-- FUNÇÃO: Verificar se banco está vazio
-- =====================================================
DROP FUNCTION IF EXISTS public.is_database_empty() CASCADE;
CREATE OR REPLACE FUNCTION public.is_database_empty()
RETURNS BOOLEAN AS $$
DECLARE
    materiastotal INTEGER;
BEGIN
    SELECT COUNT(*) INTO materiastotal FROM public.materiais;
    RETURN materiastotal = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Importar dados do localStorage
-- =====================================================
DROP FUNCTION IF EXISTS public.importar_dados(
    p_materiais JSONB,
    p_produtos JSONB,
    p_fichas JSONB,
    p_estoque_produtos JSONB,
    p_mov_materiais JSONB,
    p_mov_produtos JSONB,
    p_clientes JSONB,
    p_pedidos JSONB,
    p_itens_pedido JSONB
);

CREATE OR REPLACE FUNCTION public.importar_dados(
    p_materiais JSONB,
    p_produtos JSONB,
    p_fichas JSONB,
    p_estoque_produtos JSONB,
    p_mov_materiais JSONB,
    p_mov_produtos JSONB,
    p_clientes JSONB,
    p_pedidos JSONB,
    p_itens_pedido JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Importar materiais
    IF p_materiais IS NOT NULL THEN
        INSERT INTO public.materiais 
        (id, nome, unidade, quantidade_atual, quantidade_minima, custo_unitario, fornecedor, data_ultima_atualizacao)
        SELECT * FROM jsonb_populate_recordset(null::public.materiais, p_materiais)
        ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            unidade = EXCLUDED.unidade,
            quantidade_atual = EXCLUDED.quantidade_atual,
            quantidade_minima = EXCLUDED.quantidade_minima,
            custo_unitario = EXCLUDED.custo_unitario,
            fornecedor = EXCLUDED.fornecedor,
            data_ultima_atualizacao = EXCLUDED.data_ultima_atualizacao;
    END IF;

    -- Importar produtos
    IF p_produtos IS NOT NULL THEN
        INSERT INTO public.produtos
        (id, nome, categoria, descricao, unidade_producao, tempo_producao_minutos, custo_producao_calculado, ativo, margem_lucro, preco_venda, imagem)
        SELECT * FROM jsonb_populate_recordset(null::public.produtos, p_produtos)
        ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            categoria = EXCLUDED.categoria,
            descricao = EXCLUDED.descricao,
            unidade_producao = EXCLUDED.unidade_producao,
            tempo_producao_minutos = EXCLUDED.tempo_producao_minutos,
            custo_producao_calculado = EXCLUDED.custo_producao_calculado,
            ativo = EXCLUDED.ativo,
            margem_lucro = EXCLUDED.margem_lucro,
            preco_venda = EXCLUDED.preco_venda,
            imagem = EXCLUDED.imagem;
    END IF;

    -- Importar fichas técnicas
    IF p_fichas IS NOT NULL THEN
        INSERT INTO public.fichas_tecnicas
        (id, produto_id, material_id, quantidade_necessaria, unidade)
        SELECT * FROM jsonb_populate_recordset(null::public.fichas_tecnicas, p_fichas)
        ON CONFLICT (id) DO UPDATE SET
            produto_id = EXCLUDED.produto_id,
            material_id = EXCLUDED.material_id,
            quantidade_necessaria = EXCLUDED.quantidade_necessaria,
            unidade = EXCLUDED.unidade;
    END IF;

    -- Importar estoque produtos
    IF p_estoque_produtos IS NOT NULL THEN
        INSERT INTO public.estoque_produtos
        (id, produto_id, quantidade_disponivel, quantidade_reservada, quantidade_minima, data_validade, lote, data_atualizacao)
        SELECT * FROM jsonb_populate_recordset(null::public.estoque_produtos, p_estoque_produtos)
        ON CONFLICT (id) DO UPDATE SET
            produto_id = EXCLUDED.produto_id,
            quantidade_disponivel = EXCLUDED.quantidade_disponivel,
            quantidade_reservada = EXCLUDED.quantidade_reservada,
            quantidade_minima = EXCLUDED.quantidade_minima,
            data_validade = EXCLUDED.data_validade,
            lote = EXCLUDED.lote,
            data_atualizacao = EXCLUDED.data_atualizacao;
    END IF;

    -- Importar movimentação materiais
    IF p_mov_materiais IS NOT NULL THEN
        INSERT INTO public.movimentacoes_materiais
        (id, material_id, tipo, quantidade, observacao, valor_pago, custo_unitario, criado_em)
        SELECT * FROM jsonb_populate_recordset(null::public.movimentacoes_materiais, p_mov_materiais)
        ON CONFLICT (id) DO UPDATE SET
            material_id = EXCLUDED.material_id,
            tipo = EXCLUDED.tipo,
            quantidade = EXCLUDED.quantidade,
            observacao = EXCLUDED.observacao,
            valor_pago = EXCLUDED.valor_pago,
            custo_unitario = EXCLUDED.custo_unitario;
    END IF;

    -- Importar movimentação produtos
    IF p_mov_produtos IS NOT NULL THEN
        INSERT INTO public.movimentacoes_produtos
        (id, produto_id, tipo, quantidade, pedido_id, observacao, criado_em)
        SELECT * FROM jsonb_populate_recordset(null::public.movimentacoes_produtos, p_mov_produtos)
        ON CONFLICT (id) DO UPDATE SET
            produto_id = EXCLUDED.produto_id,
            tipo = EXCLUDED.tipo,
            quantidade = EXCLUDED.quantidade,
            pedido_id = EXCLUDED.pedido_id,
            observacao = EXCLUDED.observacao;
    END IF;

    -- Importar clientes
    IF p_clientes IS NOT NULL THEN
        INSERT INTO public.clientes
        (id, nome, tipo, telefone, email, endereco, observacoes)
        SELECT * FROM jsonb_populate_recordset(null::public.clientes, p_clientes)
        ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            tipo = EXCLUDED.tipo,
            telefone = EXCLUDED.telefone,
            email = EXCLUDED.email,
            endereco = EXCLUDED.endereco,
            observacoes = EXCLUDED.observacoes;
    END IF;

    -- Importar pedidos
    IF p_pedidos IS NOT NULL THEN
        INSERT INTO public.pedidos
        (id, cliente_id, data_pedido, data_entrega_prevista, status, observacoes, valor_total, criado_by, atualizado_em)
        SELECT * FROM jsonb_populate_recordset(null::public.pedidos, p_pedidos)
        ON CONFLICT (id) DO UPDATE SET
            cliente_id = EXCLUDED.cliente_id,
            data_pedido = EXCLUDED.data_pedido,
            data_entrega_prevista = EXCLUDED.data_entrega_prevista,
            status = EXCLUDED.status,
            observacoes = EXCLUDED.observacoes,
            valor_total = EXCLUDED.valor_total,
            criado_by = EXCLUDED.criado_by,
            atualizado_em = EXCLUDED.atualizado_em;
    END IF;

    -- Importar itens pedido
    IF p_itens_pedido IS NOT NULL THEN
        INSERT INTO public.itens_pedido
        (id, pedido_id, produto_id, quantidade_solicitada, quantidade_produzida, preco_unitario, observacao)
        SELECT * FROM jsonb_populate_recordset(null::public.itens_pedido, p_itens_pedido)
        ON CONFLICT (id) DO UPDATE SET
            pedido_id = EXCLUDED.pedido_id,
            produto_id = EXCLUDED.produto_id,
            quantidade_solicitada = EXCLUDED.quantidade_solicitada,
            quantidade_produzida = EXCLUDED.quantidade_produzida,
            preco_unitario = EXCLUDED.preco_unitario,
            observacao = EXCLUDED.observacao;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VISÃO: Status da sincronização
-- =====================================================
CREATE OR REPLACE VIEW public.status_sincronizacao AS
SELECT 
    (SELECT COUNT(*) FROM public.materiais) AS total_materiais,
    (SELECT COUNT(*) FROM public.produtos) AS total_produtos,
    (SELECT COUNT(*) FROM public.clientes) AS total_clientes,
    (SELECT COUNT(*) FROM public.pedidos) AS total_pedidos,
    (SELECT COUNT(*) FROM public.estoque_produtos) AS total_estoque,
    (SELECT COUNT(*) FROM public.movimentacoes_materiais) AS total_mov_materiais,
    (SELECT COUNT(*) FROM public.movimentacoes_produtos) AS total_mov_produtos,
    is_database_empty() AS banco_vazio;