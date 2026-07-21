-- =====================================================
-- MIGRAÇÃO CONSOLIDADA: Mini-Factory v2
-- Tudo-em-um: tables, RBAC, financeiro, estoque, etc.
-- Segura para banco novo. Idempotente.
-- =====================================================

-- EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- FUNÇÕES
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

CREATE OR REPLACE FUNCTION verificar_admin_ativo_existe()
RETURNS BOOLEAN AS $$ DECLARE total INTEGER; BEGIN
    SELECT COUNT(*) INTO total FROM public.perfis_usuario
    WHERE perfil_id = 1 AND ativo = true;
    RETURN total > 0;
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

INSERT INTO public.unidades (id, sigla, nome, tipo) OVERRIDING SYSTEM VALUE VALUES
    (1, 'kg', 'Quilograma', 'massa'),
    (2, 'g', 'Grama', 'massa'),
    (3, 'L', 'Litro', 'volume'),
    (4, 'mL', 'Mililitro', 'volume'),
    (5, 'un', 'Unidade', 'unidade'),
    (6, 'cx', 'Caixa', 'unidade'),
    (7, 'pc', 'Pacote', 'unidade'),
    (8, 'ct', 'Cento', 'unidade'),
    (9, 'dz', 'Dúzia', 'unidade')
ON CONFLICT (sigla) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.unidades', 'id'), COALESCE((SELECT MAX(id) FROM public.unidades), 1));

-- =====================================================
-- LOOKUP: CATEGORIAS DE PRODUTO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7) DEFAULT '#d97706'
);

INSERT INTO public.categorias (id, nome, cor) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Salgado', '#d97706'),
    (2, 'Doce', '#dc2626'),
    (3, 'Bolo', '#7c3aed'),
    (4, 'Bebida', '#2563eb'),
    (5, 'Outro', '#6b7280')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.categorias', 'id'), COALESCE((SELECT MAX(id) FROM public.categorias), 1));

-- =====================================================
-- LOOKUP: STATUS PEDIDO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.status_pedido (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    ordem INTEGER NOT NULL DEFAULT 0,
    cor VARCHAR(7) DEFAULT '#6b7280'
);

INSERT INTO public.status_pedido (id, nome, ordem, cor) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Rascunho', 0, '#9ca3af'),
    (2, 'Confirmado', 1, '#2563eb'),
    (3, 'Em Produção', 2, '#d97706'),
    (4, 'Pronto', 3, '#059669'),
    (5, 'Entregue', 4, '#16a34a'),
    (6, 'Cancelado', 5, '#dc2626')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.status_pedido', 'id'), COALESCE((SELECT MAX(id) FROM public.status_pedido), 1));

-- =====================================================
-- LOOKUP: TIPOS DE MOVIMENTAÇÃO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_movimentacao (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    natureza VARCHAR(10) NOT NULL CHECK (natureza IN ('entrada', 'saida')),
    entidade VARCHAR(20) NOT NULL CHECK (entidade IN ('produto', 'material', 'ambos'))
);

INSERT INTO public.tipos_movimentacao (id, nome, natureza, entidade) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Entrada Compra', 'entrada', 'material'),
    (2, 'Saída Produção', 'saida', 'material'),
    (3, 'Ajuste Estoque (Entrada)', 'entrada', 'ambos'),
    (4, 'Ajuste Estoque (Saída)', 'saida', 'ambos'),
    (5, 'Entrada Produção', 'entrada', 'produto'),
    (6, 'Saída Pedido', 'saida', 'produto'),
    (7, 'Venda Direta', 'saida', 'produto')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.tipos_movimentacao', 'id'), COALESCE((SELECT MAX(id) FROM public.tipos_movimentacao), 1));


-- =====================================================
-- LOOKUP: TIPOS DE CLIENTE (sem FK ainda, adiciona depois)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_cliente (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO public.tipos_cliente (id, nome) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Lanchonete / Revenda'),
    (2, 'Buffet / Festas'),
    (3, 'Pessoa Particular'),
    (4, 'Outros Convênios')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.tipos_cliente', 'id'), COALESCE((SELECT MAX(id) FROM public.tipos_cliente), 1));

-- =====================================================
-- LOOKUP: NÍVEIS DE ACESSO
-- =====================================================
CREATE TABLE IF NOT EXISTS public.niveis_acesso (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO public.niveis_acesso (id, nome) OVERRIDING SYSTEM VALUE VALUES
    (1, 'admin'),
    (2, 'gerente'),
    (3, 'operador'),
    (4, 'visualizador')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.niveis_acesso', 'id'), COALESCE((SELECT MAX(id) FROM public.niveis_acesso), 1));

-- =====================================================
-- FORNECEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome_fantasia VARCHAR(255) NOT NULL,
    contato VARCHAR(255),
    telefone VARCHAR(50),
    email VARCHAR(255),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CATEGORIAS FINANCEIRAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias_financeiro (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    cor VARCHAR(7) DEFAULT '#6b7280'
);

INSERT INTO public.categorias_financeiro (id, nome, tipo, cor) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Venda de Produtos', 'receita', '#16a34a'),
    (2, 'Encomendas Personalizadas', 'receita', '#0d9488'),
    (3, 'Buffet / Eventos', 'receita', '#7c3aed'),
    (4, 'Taxa de Entrega', 'receita', '#ea580c'),
    (5, 'Outras Receitas', 'receita', '#6b7280'),
    (6, 'Matéria-Prima', 'despesa', '#dc2626'),
    (7, 'Embalagens', 'despesa', '#ea580c'),
    (8, 'Gás / Energia', 'despesa', '#d97706'),
    (9, 'Aluguel', 'despesa', '#9333ea'),
    (10, 'Salários', 'despesa', '#2563eb'),
    (11, 'Água', 'despesa', '#0891b2'),
    (12, 'Manutenção', 'despesa', '#6b7280'),
    (13, 'Marketing', 'despesa', '#db2777'),
    (14, 'Outras Despesas', 'despesa', '#4b5563'),
    (15, 'Estorno', 'despesa', '#7c3aed')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.categorias_financeiro', 'id'), COALESCE((SELECT MAX(id) FROM public.categorias_financeiro), 1));

-- Adicionar FK depois que categorias_financeiro já existe
ALTER TABLE public.tipos_cliente ADD COLUMN IF NOT EXISTS categoria_receita_id INTEGER REFERENCES public.categorias_financeiro(id);

-- Mapear categorias nos tipos de cliente
UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Venda de Produtos'
) WHERE nome = 'Lanchonete / Revenda';

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Buffet / Eventos'
) WHERE nome = 'Buffet / Salão de Festas';

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Encomendas Personalizadas'
) WHERE nome = 'Pessoa Particular';

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Outras Receitas'
) WHERE nome = 'Outros Convênios';

-- =====================================================
-- RBAC: PERMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.permissoes (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    grupo VARCHAR(50) NOT NULL
);

INSERT INTO public.permissoes (id, chave, nome, grupo) OVERRIDING SYSTEM VALUE VALUES
    (1, 'materiais.ver', 'Ver Materiais', 'Materiais'),
    (2, 'materiais.criar', 'Criar Materiais', 'Materiais'),
    (3, 'materiais.editar', 'Editar Materiais', 'Materiais'),
    (4, 'materiais.excluir', 'Excluir Materiais', 'Materiais'),
    (5, 'produtos.ver', 'Ver Produtos', 'Produtos'),
    (6, 'produtos.criar', 'Criar Produtos', 'Produtos'),
    (7, 'produtos.editar', 'Editar Produtos', 'Produtos'),
    (8, 'produtos.excluir', 'Excluir Produtos', 'Produtos'),
    (9, 'estoque.ver', 'Ver Estoque', 'Estoque'),
    (10, 'estoque.criar', 'Lançar Produção', 'Estoque'),
    (11, 'estoque.editar', 'Editar Estoque', 'Estoque'),
    (12, 'estoque.limpar_historico', 'Limpar Histórico de Movimentações', 'Estoque'),
    (13, 'clientes.ver', 'Ver Clientes', 'Clientes'),
    (14, 'clientes.criar', 'Criar Clientes', 'Clientes'),
    (15, 'clientes.editar', 'Editar Clientes', 'Clientes'),
    (16, 'clientes.excluir', 'Excluir Clientes', 'Clientes'),
    (17, 'pedidos.ver', 'Ver Pedidos', 'Pedidos'),
    (18, 'pedidos.criar', 'Criar Pedidos', 'Pedidos'),
    (19, 'pedidos.editar', 'Editar Pedidos', 'Pedidos'),
    (20, 'pedidos.excluir', 'Excluir Pedidos', 'Pedidos'),
    (21, 'pedidos.aprovar', 'Aprovar Pedidos', 'Pedidos'),
    (22, 'pedidos.cancelar', 'Cancelar Pedidos', 'Pedidos'),
    (23, 'financeiro.ver', 'Ver Financeiro', 'Financeiro'),
    (24, 'financeiro.lancar', 'Lançar Despesas', 'Financeiro'),
    (25, 'usuarios.ver', 'Ver Usuários', 'Usuários'),
    (26, 'usuarios.criar', 'Criar Usuários', 'Usuários'),
    (27, 'usuarios.editar', 'Editar Usuários', 'Usuários'),
    (28, 'usuarios.excluir', 'Excluir Usuários', 'Usuários'),
    (29, 'relatorios.ver', 'Ver Relatórios', 'Relatórios'),
    (30, 'config.editar', 'Editar Configurações', 'Sistema'),
    (31, 'fornecedores.ver', 'Ver Fornecedores', 'Fornecedores'),
    (32, 'fornecedores.criar', 'Criar Fornecedores', 'Fornecedores'),
    (33, 'fornecedores.editar', 'Editar Fornecedores', 'Fornecedores'),
    (34, 'fornecedores.excluir', 'Excluir Fornecedores', 'Fornecedores')
ON CONFLICT (chave) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.permissoes', 'id'), COALESCE((SELECT MAX(id) FROM public.permissoes), 1));

-- =====================================================
-- RBAC: PERFIS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT
);

INSERT INTO public.perfis (id, nome, descricao) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Admin', 'Acesso total ao sistema'),
    (2, 'Gerente', 'Gerencia operações e financeiro'),
    (3, 'Operador', 'Operação do dia a dia'),
    (4, 'Visualizador', 'Apenas consulta')
ON CONFLICT (nome) DO NOTHING;

-- Reset sequence to avoid conflict on future inserts
SELECT setval(pg_get_serial_sequence('public.perfis', 'id'), COALESCE((SELECT MAX(id) FROM public.perfis), 1));

-- =====================================================
-- RBAC: PERFIS × PERMISSÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis_permissoes (
    perfil_id INTEGER NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    permissao_id INTEGER NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
    PRIMARY KEY (perfil_id, permissao_id)
);

INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm WHERE p.nome = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Gerente'
  AND perm.chave NOT IN ('config.editar', 'usuarios.excluir')
ON CONFLICT DO NOTHING;

INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Operador'
  AND perm.chave IN (
    'materiais.ver', 'materiais.criar', 'materiais.editar',
    'produtos.ver', 'produtos.criar', 'produtos.editar',
    'estoque.ver', 'estoque.criar', 'estoque.editar',
    'clientes.ver', 'clientes.criar', 'clientes.editar',
    'pedidos.ver', 'pedidos.criar', 'pedidos.editar',
    'fornecedores.ver', 'fornecedores.criar', 'fornecedores.editar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Visualizador'
  AND perm.chave IN (
    'materiais.ver', 'produtos.ver', 'estoque.ver',
    'clientes.ver', 'pedidos.ver', 'relatorios.ver',
    'fornecedores.ver'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- CONFIGURAÇÃO DO SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracao_sistema (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT false,
    consumo_dias_analise INTEGER DEFAULT 30,
    alerta_estoque_dias INTEGER DEFAULT 7,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recovery_code_hash TEXT,
    nome_empresa VARCHAR(255),
    cnpj VARCHAR(18),
    inscricao_municipal VARCHAR(30),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf CHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    slogan VARCHAR(255)
);

INSERT INTO public.configuracao_sistema (id, primeiro_acesso_concluido)
VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PERFIS DE USUÁRIO (vinculado a auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    perfil_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.perfis(id),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recovery_code_hash TEXT,
    recovery_code_shown BOOLEAN NOT NULL DEFAULT false
);

-- =====================================================
-- TABELAS DE DADOS
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
    desconto_valor DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    criado_by VARCHAR(255),
    categoria_receita_id INTEGER REFERENCES public.categorias_financeiro(id),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.estoque_produtos (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    quantidade_disponivel DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_minima DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT estoque_disponivel_nao_negativo CHECK (quantidade_disponivel >= 0)
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
    usuario_id UUID REFERENCES public.perfis_usuario(id),
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
CREATE INDEX IF NOT EXISTS idx_mov_prod_usuario ON public.movimentacoes_produtos(usuario_id);

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
-- IMMUTABLE SYSTEM LOOKUPS
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_system_lookup_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'This system lookup record is immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

-- Apply to unidades
DROP TRIGGER IF EXISTS trigger_prevent_unidades_mutation ON public.unidades;
CREATE TRIGGER trigger_prevent_unidades_mutation
    BEFORE UPDATE OR DELETE ON public.unidades
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to status_pedido
DROP TRIGGER IF EXISTS trigger_prevent_status_pedido_mutation ON public.status_pedido;
CREATE TRIGGER trigger_prevent_status_pedido_mutation
    BEFORE UPDATE OR DELETE ON public.status_pedido
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to tipos_movimentacao
DROP TRIGGER IF EXISTS trigger_prevent_tipos_movimentacao_mutation ON public.tipos_movimentacao;
CREATE TRIGGER trigger_prevent_tipos_movimentacao_mutation
    BEFORE UPDATE OR DELETE ON public.tipos_movimentacao
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to niveis_acesso
DROP TRIGGER IF EXISTS trigger_prevent_niveis_acesso_mutation ON public.niveis_acesso;
CREATE TRIGGER trigger_prevent_niveis_acesso_mutation
    BEFORE UPDATE OR DELETE ON public.niveis_acesso
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to permissoes
DROP TRIGGER IF EXISTS trigger_prevent_permissoes_mutation ON public.permissoes;
CREATE TRIGGER trigger_prevent_permissoes_mutation
    BEFORE UPDATE OR DELETE ON public.permissoes
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to perfis
DROP TRIGGER IF EXISTS trigger_prevent_perfis_mutation ON public.perfis;
CREATE TRIGGER trigger_prevent_perfis_mutation
    BEFORE UPDATE OR DELETE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Apply to tipos_cliente
DROP TRIGGER IF EXISTS trigger_prevent_tipos_cliente_mutation ON public.tipos_cliente;
CREATE TRIGGER trigger_prevent_tipos_cliente_mutation
    BEFORE UPDATE OR DELETE ON public.tipos_cliente
    FOR EACH ROW EXECUTE FUNCTION public.prevent_system_lookup_mutation();

-- Prevent mutation of system-seeded financial categories (IDs 1 to 15)
CREATE OR REPLACE FUNCTION public.prevent_seeded_finance_categories_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.id <= 15 THEN
        RAISE EXCEPTION 'System-seeded financial categories (ID <= 15) are immutable and cannot be updated or deleted.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_seeded_finance_categories_mutation ON public.categorias_financeiro;
CREATE TRIGGER trigger_prevent_seeded_finance_categories_mutation
    BEFORE UPDATE OR DELETE ON public.categorias_financeiro
    FOR EACH ROW EXECUTE FUNCTION public.prevent_seeded_finance_categories_mutation();

-- =====================================================
-- RECOVERY CODES
-- =====================================================
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
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  IF uid IS NULL THEN RETURN FALSE; END IF;

  SELECT recovery_code_hash INTO hash_usuario FROM perfis_usuario WHERE id = uid;
  IF hash_usuario IS NOT NULL AND crypt(p_codigo, hash_usuario) = hash_usuario THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  SELECT recovery_code_hash INTO hash_sistema FROM configuracao_sistema WHERE id = 1;
  IF hash_sistema IS NOT NULL AND crypt(p_codigo, hash_sistema) = hash_sistema THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

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
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_movimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiro ENABLE ROW LEVEL SECURITY;

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

-- Lookup tables: SELECT policies
DROP POLICY IF EXISTS "unidades_select" ON public.unidades;
CREATE POLICY "unidades_select" ON public.unidades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "unidades_insert" ON public.unidades;
CREATE POLICY "unidades_insert" ON public.unidades FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categorias_select" ON public.categorias;
CREATE POLICY "categorias_select" ON public.categorias FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "status_pedido_select" ON public.status_pedido;
CREATE POLICY "status_pedido_select" ON public.status_pedido FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tipos_movimentacao_select" ON public.tipos_movimentacao;
CREATE POLICY "tipos_movimentacao_select" ON public.tipos_movimentacao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tipos_cliente_select" ON public.tipos_cliente;
CREATE POLICY "tipos_cliente_select" ON public.tipos_cliente FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fornecedores_select" ON public.fornecedores;
CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "permissoes_select" ON public.permissoes;
CREATE POLICY "permissoes_select" ON public.permissoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "perfis_permissoes_select" ON public.perfis_permissoes;
CREATE POLICY "perfis_permissoes_select" ON public.perfis_permissoes FOR SELECT TO authenticated USING (true);

-- Categorias financeiro: full CRUD
DROP POLICY IF EXISTS "categorias_financeiro_select" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_select" ON public.categorias_financeiro FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "categorias_financeiro_insert" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_insert" ON public.categorias_financeiro FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "categorias_financeiro_update" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_update" ON public.categorias_financeiro FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "categorias_financeiro_delete" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_delete" ON public.categorias_financeiro FOR DELETE TO authenticated USING (true);

-- Dados: full CRUD policies
DO $$ DECLARE tbl TEXT; BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'materiais','produtos','fichas_tecnicas','estoque_produtos',
        'movimentacoes_produtos','movimentacoes_materiais','clientes',
        'pedidos','itens_pedido','planejamento_compras'
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

-- Lancamentos financeiro: full CRUD
DROP POLICY IF EXISTS "lancamentos_select" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_select" ON public.lancamentos_financeiros FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lancamentos_financeiro_insert" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_insert" ON public.lancamentos_financeiros FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "lancamentos_financeiro_update" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_update" ON public.lancamentos_financeiros FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "lancamentos_financeiro_delete" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_delete" ON public.lancamentos_financeiros FOR DELETE TO authenticated USING (true);

-- Fornecedores: full CRUD
DROP POLICY IF EXISTS "fornecedores_insert" ON public.fornecedores;
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "fornecedores_update" ON public.fornecedores;
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "fornecedores_delete" ON public.fornecedores;
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE TO authenticated USING (true);

-- =====================================================
-- STORAGE
-- =====================================================
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('imagem_produto', 'imagem_produto', true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('logo_empresa', 'logo_empresa', true, false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "storage_select" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'imagem_produto') WITH CHECK (bucket_id = 'imagem_produto');
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'imagem_produto');

DROP POLICY IF EXISTS "logos_select" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'logo_empresa');
DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
CREATE POLICY "logos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logo_empresa');
DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logo_empresa');

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
-- TRIGGERS PARA AUTOCRIAÇÃO DE PERFIL (auth.users -> public.perfis_usuario)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  count_usuarios INTEGER;
  perfil_inicial INTEGER;
BEGIN
  -- Conta quantos usuários já existem na tabela perfis_usuario
  SELECT COUNT(*) INTO count_usuarios FROM public.perfis_usuario;
  
  -- Se for o primeiro usuário, define como Admin (1). Caso contrário, Operador (3).
  IF count_usuarios = 0 THEN
    perfil_inicial := 1;
  ELSE
    perfil_inicial := 3;
  END IF;

  INSERT INTO public.perfis_usuario (id, nome, perfil_id, ativo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    perfil_inicial,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PERMISSÕES DE SCHEMA (Segurança para bancos recém-recriados)
-- =====================================================

-- Restaura permissão de uso do schema public
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Restaura permissões padrão para novas tabelas, funções e sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Concede permissões em todas as tabelas, sequences e funções criadas
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;


