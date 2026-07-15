-- ============================================
-- LIMPA HISTÓRICO DE MOVIMENTAÇÕES
-- Mantém pedidos, produtos, materiais e estoque
-- ============================================

DELETE FROM movimentacoes_materiais;
DELETE FROM movimentacoes_produtos;

-- Zera estoque de produtos para partir do zero
UPDATE estoque_produtos SET quantidade_disponivel = 0, data_atualizacao = NOW();

-- Restaura materiais para quantidade inicial (estoque cheio)
-- Ajuste os valores conforme sua realidade
UPDATE materiais SET quantidade_atual = 50 WHERE nome LIKE 'Farinha%';
UPDATE materiais SET quantidade_atual = 30 WHERE nome LIKE 'Açúcar%';
UPDATE materiais SET quantidade_atual = 20 WHERE nome LIKE 'Leite%';
UPDATE materiais SET quantidade_atual = 10 WHERE nome LIKE 'Manteiga%';
UPDATE materiais SET quantidade_atual = 120 WHERE nome LIKE 'Ovos%';
UPDATE materiais SET quantidade_atual = 15 WHERE nome LIKE 'Óleo%';
UPDATE materiais SET quantidade_atual = 500 WHERE nome LIKE 'Sal%';
UPDATE materiais SET quantidade_atual = 200 WHERE nome LIKE 'Fermento%';
UPDATE materiais SET quantidade_atual = 8 WHERE nome LIKE 'Frango%';
UPDATE materiais SET quantidade_atual = 5 WHERE nome LIKE 'Catupiry%';

SELECT 'HISTÓRICO LIMPO' AS status;
