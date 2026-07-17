-- =====================================================
-- SIMPLIFICAÇÃO DO ESTOQUE
-- Merge quantidade_reservada → quantidade_disponivel
-- Adiciona CHECK para evitar negativos
-- =====================================================

-- 1. Mesclar reservada em disponivel para não perder estoque
UPDATE estoque_produtos
SET quantidade_disponivel = quantidade_disponivel + quantidade_reservada,
    quantidade_reservada = 0;

-- 2. Adicionar CHECK para evitar negativos no disponivel
ALTER TABLE estoque_produtos DROP CONSTRAINT IF EXISTS estoque_disponivel_nao_negativo;
ALTER TABLE estoque_produtos ADD CONSTRAINT estoque_disponivel_nao_negativo
    CHECK (quantidade_disponivel >= 0);
