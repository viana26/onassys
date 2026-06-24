-- ============================================
-- CLEANUP — Remove all test data
-- Run AFTER testing
-- ============================================

DELETE FROM movimentacoes_materiais WHERE id LIKE 'movm_test_%';
DELETE FROM movimentacoes_produtos WHERE id LIKE 'movp_test_%';
DELETE FROM itens_pedido WHERE id LIKE 'ip_test_%';
DELETE FROM pedidos WHERE id LIKE 'ped_test_%';
DELETE FROM clientes WHERE id LIKE 'cli_test_%';
DELETE FROM fichas_tecnicas WHERE id LIKE 'ft_test_%';
DELETE FROM estoque_produtos WHERE id LIKE 'est_test_%';
DELETE FROM produtos WHERE id LIKE 'prod_test_%';
DELETE FROM materiais WHERE id LIKE 'mat_test_%';
DELETE FROM fornecedores WHERE id BETWEEN 1 AND 3;

SELECT 'TEST DATA CLEANED' AS status;
