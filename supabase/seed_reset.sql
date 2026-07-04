-- ============================================
-- RESET COMPLETO — limpa TODOS os dados
-- Lookups, RBAC, usuários e config preservados
-- ============================================

DELETE FROM planejamento_compras;
DELETE FROM lancamentos_financeiros;
DELETE FROM movimentacoes_materiais;
DELETE FROM movimentacoes_produtos;
DELETE FROM itens_pedido;
DELETE FROM pedidos;
DELETE FROM estoque_produtos;
DELETE FROM fichas_tecnicas;
DELETE FROM produtos;
DELETE FROM materiais;
DELETE FROM fornecedores;
DELETE FROM clientes;

SELECT 'RESET CONCLUIDO' AS status;
