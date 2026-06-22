-- Schema inicial completo para a fábrica de salgados, bolos e doces (Salgados & Bolos Mini-Factory)
-- Compatível com PostgreSQL e Supabase

-- Criar tabela de Materiais (Matérias-primas e ingredientes)
CREATE TABLE IF NOT EXISTS materiais (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    unidade VARCHAR(50) NOT NULL, -- 'kg' | 'g' | 'L' | 'mL' | 'un'
    quantidade_atual DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_minima DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    custo_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    fornecedor VARCHAR(255),
    data_ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Produtos (Salgados, bolos, etc.)
CREATE TABLE IF NOT EXISTS produtos (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL, -- 'salgado' | 'doce' | 'bolo' | 'bebida' | 'outro'
    descricao TEXT,
    unidade_producao VARCHAR(255) NOT NULL, -- ex: 'por dúzia', 'por kg', 'por unidade'
    tempo_producao_minutos INTEGER NOT NULL DEFAULT 0,
    custo_producao_calculado DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ativo BOOLEAN NOT NULL DEFAULT true,
    margem_lucro DECIMAL(12, 2) DEFAULT 0.00, -- percentual de lucro (ex: 100 para 100%)
    preco_venda DECIMAL(12, 2) DEFAULT 0.00, -- preço final de venda
    imagem TEXT -- base64 comprimido ou URL pública do Supabase Storage
);

-- Criar tabela de Ficha Técnica (Relacionamento produto x insumos)
CREATE TABLE IF NOT EXISTS fichas_tecnicas (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    material_id VARCHAR(255) NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
    quantidade_necessaria DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    unidade VARCHAR(50) NOT NULL -- 'kg' | 'g' | 'L' | 'mL' | 'un'
);

-- Criar tabela de Estoque de Produtos Acabados
CREATE TABLE IF NOT EXISTS estoque_produtos (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade_disponivel DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_reservada DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_minima DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    data_validade DATE,
    lote VARCHAR(100),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Movimentação de Produtos
CREATE TABLE IF NOT EXISTS movimentacoes_produtos (
    id VARCHAR(255) PRIMARY KEY,
    produto_id VARCHAR(255) NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL, -- 'entrada_producao' | 'saida_pedido' | 'ajuste'
    quantidade DECIMAL(12, 4) NOT NULL,
    pedido_id VARCHAR(255),
    observacao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Movimentação de Materiais
CREATE TABLE IF NOT EXISTS movimentacoes_materiais (
    id VARCHAR(255) PRIMARY KEY,
    material_id VARCHAR(255) NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
    tipo VARCHAR(100) NOT NULL, -- 'entrada_compra' | 'saida_producao' | 'ajuste'
    quantidade DECIMAL(12, 4) NOT NULL,
    observacao TEXT,
    valor_pago DECIMAL(12, 2),
    custo_unitario DECIMAL(12, 2),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(255) PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL, -- 'lanchonete' | 'evento' | 'particular' | 'outro'
    telefone VARCHAR(100),
    email VARCHAR(255),
    endereco TEXT,
    observacoes TEXT
);

-- Criar tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id VARCHAR(255) PRIMARY KEY,
    cliente_id VARCHAR(255) NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    data_pedido TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_entrega_prevista TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(100) NOT NULL DEFAULT 'rascunho', -- 'rascunho' | 'confirmado' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
    observacoes TEXT,
    valor_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    criado_by VARCHAR(255),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id VARCHAR(255) PRIMARY KEY,
    pedido_id VARCHAR(255) NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id VARCHAR(255) NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade_solicitada DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    quantidade_produzida DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    preco_unitario DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    observacao TEXT
);

-- Criar índices para performance de busca e integridade
CREATE INDEX IF NOT EXISTS idx_fichas_produto ON fichas_tecnicas(produto_id);
CREATE INDEX IF NOT EXISTS idx_fichas_material ON fichas_tecnicas(material_id);
CREATE INDEX IF NOT EXISTS idx_estoque_prod ON estoque_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_prod ON movimentacoes_produtos(produto_id);
CREATE INDEX IF NOT EXISTS idx_mov_mat ON movimentacoes_materiais(material_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_itens_produto ON itens_pedido(produto_id);
