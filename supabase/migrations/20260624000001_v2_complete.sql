-- =====================================================
-- MIGRAÇÃO V2: Mini-Factory
-- Lookup tables, RBAC, Financeiro, Planejamento
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FUNÇÕES EXISTENTES (mantidas)
-- =====================================================
CREATE OR REPLACE FUNCTION atualizar_data_update()
RETURNS TRIGGER AS $$ BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP; RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_sistema_configurado()
RETURNS BOOLEAN AS $$ DECLARE config BOOLEAN; BEGIN
    SELECT primeiro_acesso_concluido INTO config FROM public.configuracao_sistema WHERE id = 1;
    RETURN COALESCE(config, false);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_count()
RETURNS INTEGER AS $$ DECLARE total INTEGER; BEGIN
    SELECT COUNT(*) INTO total FROM auth.users; RETURN total;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION concluir_primeiro_acesso()
RETURNS VOID AS $$ BEGIN
    UPDATE public.configuracao_sistema SET primeiro_acesso_concluido = true WHERE id = 1;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_database_empty()
RETURNS BOOLEAN AS $$ DECLARE total INTEGER; BEGIN
    SELECT COUNT(*) INTO total FROM public.materiais; RETURN total = 0;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- LOOKUP: UNIDADES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.unidades (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sigla VARCHAR(10) NOT NULL UNIQUE,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('massa', 'volume', 'unidade')),
    fator_base DECIMAL(12, 6) DEFAULT 1
);

INSERT INTO public.unidades (sigla, nome, tipo) VALUES
    ('kg', 'Quilograma', 'massa'),
    ('g', 'Grama', 'massa'),
    ('L', 'Litro', 'volume'),
    ('mL', 'Mililitro', 'volume'),
    ('un', 'Unidade', 'unidade'),
    ('cx', 'Caixa', 'unidade'),
    ('pc', 'Pacote', 'unidade')
ON CONFLICT (sigla) DO NOTHING;

-- =====================================================
-- LOOKUP: CATEGORIAS DE PRODUTO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7) DEFAULT '#d97706'
);

INSERT INTO public.categorias (nome, cor) VALUES
    ('Salgado', '#d97706'),
    ('Doce', '#dc2626'),
    ('Bolo', '#7c3aed'),
    ('Bebida', '#2563eb'),
    ('Outro', '#6b7280')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- LOOKUP: STATUS PEDIDO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.status_pedido (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    ordem INTEGER NOT NULL DEFAULT 0,
    cor VARCHAR(7) DEFAULT '#6b7280'
);

INSERT INTO public.status_pedido (nome, ordem, cor) VALUES
    ('Rascunho', 0, '#9ca3af'),
    ('Confirmado', 1, '#2563eb'),
    ('Em Produção', 2, '#d97706'),
    ('Pronto', 3, '#059669'),
    ('Entregue', 4, '#16a34a'),
    ('Cancelado', 5, '#dc2626')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- LOOKUP: TIPOS DE MOVIMENTAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_movimentacao (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    natureza VARCHAR(10) NOT NULL CHECK (natureza IN ('entrada', 'saida')),
    entidade VARCHAR(20) NOT NULL CHECK (entidade IN ('produto', 'material', 'ambos'))
);

INSERT INTO public.tipos_movimentacao (nome, natureza, entidade) VALUES
    ('Entrada Compra', 'entrada', 'material'),
    ('Saída Produção', 'saida', 'material'),
    ('Ajuste Estoque', 'entrada', 'ambos'),
    ('Entrada Produção', 'entrada', 'produto'),
    ('Saída Pedido', 'saida', 'produto')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- LOOKUP: TIPOS DE CLIENTE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_cliente (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO public.tipos_cliente (nome) VALUES
    ('Lanchonete / Revenda'),
    ('Buffet / Salão de Festas'),
    ('Pessoa Particular'),
    ('Outros Convênios')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- LOOKUP: NÍVEIS DE ACESSO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.niveis_acesso (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO public.niveis_acesso (nome) VALUES
    ('admin'),
    ('gerente'),
    ('operador'),
    ('visualizador')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- LOOKUP: FORNECEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome_fantasia VARCHAR(255) NOT NULL,
    contato VARCHAR(255),
    telefone VARCHAR(50),
    email VARCHAR(255),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RBAC: PERMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissoes (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    grupo VARCHAR(50) NOT NULL
);

INSERT INTO public.permissoes (chave, nome, grupo) VALUES
    ('materiais.ver', 'Ver Materiais', 'Materiais'),
    ('materiais.criar', 'Criar Materiais', 'Materiais'),
    ('materiais.editar', 'Editar Materiais', 'Materiais'),
    ('materiais.excluir', 'Excluir Materiais', 'Materiais'),
    ('produtos.ver', 'Ver Produtos', 'Produtos'),
    ('produtos.criar', 'Criar Produtos', 'Produtos'),
    ('produtos.editar', 'Editar Produtos', 'Produtos'),
    ('produtos.excluir', 'Excluir Produtos', 'Produtos'),
    ('estoque.ver', 'Ver Estoque', 'Estoque'),
    ('estoque.criar', 'Lançar Produção', 'Estoque'),
    ('estoque.editar', 'Editar Estoque', 'Estoque'),
    ('clientes.ver', 'Ver Clientes', 'Clientes'),
    ('clientes.criar', 'Criar Clientes', 'Clientes'),
    ('clientes.editar', 'Editar Clientes', 'Clientes'),
    ('clientes.excluir', 'Excluir Clientes', 'Clientes'),
    ('pedidos.ver', 'Ver Pedidos', 'Pedidos'),
    ('pedidos.criar', 'Criar Pedidos', 'Pedidos'),
    ('pedidos.editar', 'Editar Pedidos', 'Pedidos'),
    ('pedidos.excluir', 'Excluir Pedidos', 'Pedidos'),
    ('pedidos.aprovar', 'Aprovar Pedidos', 'Pedidos'),
    ('pedidos.cancelar', 'Cancelar Pedidos', 'Pedidos'),
    ('financeiro.ver', 'Ver Financeiro', 'Financeiro'),
    ('financeiro.lancar', 'Lançar Despesas', 'Financeiro'),
    ('usuarios.ver', 'Ver Usuários', 'Usuários'),
    ('usuarios.criar', 'Criar Usuários', 'Usuários'),
    ('usuarios.editar', 'Editar Usuários', 'Usuários'),
    ('usuarios.excluir', 'Excluir Usuários', 'Usuários'),
    ('relatorios.ver', 'Ver Relatórios', 'Relatórios'),
    ('config.editar', 'Editar Configurações', 'Sistema')
ON CONFLICT (chave) DO NOTHING;

-- =====================================================
-- RBAC: PERFIS (papéis)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT
);

INSERT INTO public.perfis (nome, descricao) VALUES
    ('Admin', 'Acesso total ao sistema'),
    ('Gerente', 'Gerencia operações e financeiro'),
    ('Operador', 'Operação do dia a dia'),
    ('Visualizador', 'Apenas consulta')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- RBAC: PERFIS × PERMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis_permissoes (
    perfil_id INTEGER NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    permissao_id INTEGER NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (perfil_id, permissao_id)
);

-- Admin: todas as permissões
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm WHERE p.nome = 'Admin'
ON CONFLICT DO NOTHING;

-- Gerente: tudo exceto config.editar, usuarios.excluir
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Gerente'
  AND perm.chave NOT IN ('config.editar', 'usuarios.excluir')
ON CONFLICT DO NOTHING;

-- Operador: materiais, produtos, estoque, pedidos (sem excluir)
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Operador'
  AND perm.chave IN (
    'materiais.ver', 'materiais.criar', 'materiais.editar',
    'produtos.ver', 'produtos.criar', 'produtos.editar',
    'estoque.ver', 'estoque.criar', 'estoque.editar',
    'clientes.ver', 'clientes.criar', 'clientes.editar',
    'pedidos.ver', 'pedidos.criar', 'pedidos.editar'
  )
ON CONFLICT DO NOTHING;

-- Visualizador: apenas SELECTs
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Visualizador'
  AND perm.chave IN (
    'materiais.ver', 'produtos.ver', 'estoque.ver',
    'clientes.ver', 'pedidos.ver', 'relatorios.ver'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- CATEGORIAS FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias_financeiro (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    cor VARCHAR(7) DEFAULT '#6b7280'
);

INSERT INTO public.categorias_financeiro (nome, tipo, cor) VALUES
    ('Venda de Produtos', 'receita', '#16a34a'),
    ('Matéria-Prima', 'despesa', '#dc2626'),
    ('Embalagens', 'despesa', '#ea580c'),
    ('Gás / Energia', 'despesa', '#d97706'),
    ('Aluguel', 'despesa', '#9333ea'),
    ('Salários', 'despesa', '#2563eb'),
    ('Água', 'despesa', '#0891b2'),
    ('Manutenção', 'despesa', '#6b7280'),
    ('Marketing', 'despesa', '#db2777'),
    ('Outras Despesas', 'despesa', '#4b5563')
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- CONFIGURAÇÃO DO SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracao_sistema (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT false,
    consumo_dias_analise INTEGER DEFAULT 30,
    alerta_estoque_dias INTEGER DEFAULT 7,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.configuracao_sistema (id, primeiro_acesso_concluido)
VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PERFIS (vinculado a auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    perfil_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.perfis(id),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TABELAS DE DADOS (com FKs para lookups)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.materiais (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    unidade_id INTEGER NOT NULL REFERENCES public.unidades(id),
    quantidade_atual DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_minima DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    custo_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    fornecedor_id INTEGER REFERENCES public.fornecedores(id),
    data_ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.produtos (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES public.categorias(id),
    descricao TEXT,
    unidade_producao_id INTEGER NOT NULL REFERENCES public.unidades(id),
    tempo_producao_minutos INTEGER NOT NULL DEFAULT 0,
    custo_producao_calculado DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ativo BOOLEAN NOT NULL DEFAULT true,
    margem_lucro DECIMAL(12, 2) DEFAULT 0.00,
    preco_venda DECIMAL(12, 2) DEFAULT 0.00,
    imagem TEXT
);

CREATE TABLE IF NOT EXISTS public.fichas_tecnicas (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    material_id VARCHAR(255) NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
    quantidade_necessaria DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    unidade_id INTEGER NOT NULL REFERENCES public.unidades(id)
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo_id INTEGER NOT NULL REFERENCES public.tipos_cliente(id),
    telefone VARCHAR(100),
    email VARCHAR(255),
    endereco TEXT,
    observacoes TEXT
);

CREATE TABLE IF NOT EXISTS public.pedidos (
    id VARCHAR(255) PRIMARY KEY,
    cliente_id VARCHAR(255) NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
    data_pedido TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_entrega_prevista TIMESTAMP WITH TIME ZONE NOT NULL,
    status_id INTEGER NOT NULL REFERENCES public.status_pedido(id),
    observacoes TEXT,
    valor_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    criado_by VARCHAR(255),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.estoque_produtos (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_disponivel DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_reservada DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_minima DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    data_validade DATE,
    lote VARCHAR(100),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_materiais (
    id VARCHAR(255) PRIMARY KEY,
    material_id VARCHAR(255) NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
    tipo_id INTEGER NOT NULL REFERENCES public.tipos_movimentacao(id),
    quantidade DECIMAL(12, 4) NOT NULL,
    observacao TEXT,
    valor_pago DECIMAL(12, 2),
    custo_unitario DECIMAL(12, 2),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.movimentacoes_produtos (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    tipo_id INTEGER NOT NULL REFERENCES public.tipos_movimentacao(id),
    quantidade DECIMAL(12, 4) NOT NULL,
    pedido_id VARCHAR(255),
    observacao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.itens_pedido (
    id VARCHAR(255) PRIMARY KEY,
    pedido_id VARCHAR(255) NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id VARCHAR(255) NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
    quantidade_solicitada DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_produzida DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    preco_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    observacao TEXT
);

-- =====================================================
-- LANÇAMENTOS FINANCEIROS (unificado)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
    valor DECIMAL(12, 2) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria_id INTEGER NOT NULL REFERENCES public.categorias_financeiro(id),
    descricao TEXT,
    pedido_id VARCHAR(255) REFERENCES public.pedidos(id) ON DELETE SET NULL,
    movimentacao_id VARCHAR(255),
    forma_pagamento VARCHAR(50),
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PLANEJAMENTO DE COMPRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.planejamento_compras (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    material_id VARCHAR(255) NOT NULL REFERENCES public.materiais(id) ON DELETE CASCADE,
    quantidade_sugerida DECIMAL(12, 4) NOT NULL,
    unidade_id INTEGER REFERENCES public.unidades(id),
    data_sugerida DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'comprado', 'cancelado')),
    motivo TEXT,
    consumo_medio_diario DECIMAL(12, 6),
    dias_ate_minimo INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fichas_produto ON public.fichas_tecnicas(produto_id);
CREATE INDEX IF NOT EXISTS idx_fichas_material ON public.fichas_tecnicas(material_id);
CREATE INDEX IF NOT EXISTS idx_estoque_prod ON public.estoque_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_prod ON public.movimentacoes_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_mat ON public.movimentacoes_materiais(material_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto ON public.itens_pedido(produto_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos_financeiros(data_lancamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_categoria ON public.lancamentos_financeiros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_planejamento_status ON public.planejamento_compras(status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_materiais_tipo ON public.movimentacoes_materiais(tipo_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produtos_tipo ON public.movimentacoes_produtos(tipo_id);

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_configuracao_updated ON public.configuracao_sistema;
CREATE TRIGGER trigger_configuracao_updated
    BEFORE UPDATE ON public.configuracao_sistema
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_update();

DROP TRIGGER IF EXISTS trigger_perfis_updated ON public.perfis_usuario;
CREATE TRIGGER trigger_perfis_updated
    BEFORE UPDATE ON public.perfis_usuario
    FOR EACH ROW EXECUTE FUNCTION atualizar_data_update();

-- =====================================================
-- RLS: HABILITAR
-- =====================================================
ALTER TABLE public.configuracao_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planejamento_compras ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: POLICIES
-- =====================================================
DROP POLICY IF EXISTS "config_select" ON public.configuracao_sistema;
CREATE POLICY "config_select" ON public.configuracao_sistema FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "config_update" ON public.configuracao_sistema;
CREATE POLICY "config_update" ON public.configuracao_sistema FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "perfis_usuario_select" ON public.perfis_usuario;
CREATE POLICY "perfis_usuario_select" ON public.perfis_usuario FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "perfis_usuario_all" ON public.perfis_usuario;
CREATE POLICY "perfis_usuario_all" ON public.perfis_usuario FOR ALL TO authenticated USING (true);

-- Dados: policies genéricas por tabela
DO $$ DECLARE tbl TEXT; BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'materiais','produtos','fichas_tecnicas','estoque_produtos',
        'movimentacoes_produtos','movimentacoes_materiais','clientes',
        'pedidos','itens_pedido','lancamentos_financeiros','planejamento_compras'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (true)', tbl, tbl);
    END LOOP;
END $$;

-- Storage
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'imagem_produto') WITH CHECK (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'imagem_produto');

-- =====================================================
-- VIEWS
-- =====================================================
CREATE OR REPLACE VIEW public.status_sistema AS
SELECT get_user_count() AS total_usuarios, is_sistema_configurado() AS sistema_configurado;

CREATE OR REPLACE VIEW public.status_sincronizacao AS
SELECT
    (SELECT COUNT(*) FROM public.materiais) AS total_materiais,
    (SELECT COUNT(*) FROM public.produtos) AS total_produtos,
    (SELECT COUNT(*) FROM public.clientes) AS total_clientes,
    (SELECT COUNT(*) FROM public.pedidos) AS total_pedidos,
    (SELECT COUNT(*) FROM public.estoque_produtos) AS total_estoque;

-- View financeiro: resumo do período atual
CREATE OR REPLACE VIEW public.resumo_financeiro AS
SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0) AS total_receitas,
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0) AS total_despesas,
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0) -
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0) AS saldo_periodo,
    EXTRACT(YEAR FROM data_lancamento) AS ano,
    EXTRACT(MONTH FROM data_lancamento) AS mes
FROM public.lancamentos_financeiros
GROUP BY ano, mes
ORDER BY ano DESC, mes DESC;

-- View consumo: calcula consumo médio diário por material
CREATE OR REPLACE VIEW public.consumo_materiais AS
SELECT
    m.id AS material_id,
    m.nome AS material_nome,
    COALESCE(AVG(mov.quantidade), 0) AS consumo_medio_diario,
    CASE WHEN m.quantidade_atual > 0 AND COALESCE(AVG(mov.quantidade), 0) > 0
        THEN (m.quantidade_atual / AVG(mov.quantidade))::INTEGER
        ELSE NULL
    END AS dias_ate_minimo,
    m.quantidade_atual,
    m.quantidade_minima,
    CASE WHEN m.quantidade_atual <= m.quantidade_minima THEN true ELSE false END AS precisa_comprar
FROM public.materiais m
LEFT JOIN public.movimentacoes_materiais mov
    ON mov.material_id = m.id
    AND mov.tipo_id = (SELECT id FROM public.tipos_movimentacao WHERE nome = 'Saída Produção')
    AND mov.criado_em >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.id;

-- =====================================================
-- RECOVERY CODE (redefinição de senha sem email)
-- =====================================================

-- Código de emergência do sistema (admin)
ALTER TABLE public.configuracao_sistema ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;

-- Código individual por usuário
ALTER TABLE public.perfis_usuario ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;
ALTER TABLE public.perfis_usuario ADD COLUMN IF NOT EXISTS recovery_code_shown BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION gerar_codigo_recovery()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  UPDATE configuracao_sistema SET recovery_code_hash = crypt(code, gen_salt('bf')) WHERE id = 1;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION gerar_codigo_recovery_usuario(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  UPDATE perfis_usuario SET recovery_code_hash = crypt(code, gen_salt('bf')) WHERE id = p_user_id;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION redefinir_senha_recovery(p_email TEXT, p_codigo TEXT, p_nova_senha TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  hash_sistema TEXT;
  hash_usuario TEXT;
  uid UUID;
BEGIN
  -- Buscar usuário pelo email
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  IF uid IS NULL THEN RETURN FALSE; END IF;

  -- Verificar código individual do usuário
  SELECT recovery_code_hash INTO hash_usuario FROM perfis_usuario WHERE id = uid;
  IF hash_usuario IS NOT NULL AND crypt(p_codigo, hash_usuario) = hash_usuario THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  -- Verificar código de emergência do sistema (fallback)
  SELECT recovery_code_hash INTO hash_sistema FROM configuracao_sistema WHERE id = 1;
  IF hash_sistema IS NOT NULL AND crypt(p_codigo, hash_sistema) = hash_sistema THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
