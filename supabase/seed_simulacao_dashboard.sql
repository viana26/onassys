-- =====================================================
-- SIMULAÇÃO DE DADOS PARA TESTAR O DASHBOARD
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Limpa dados de simulação anteriores (itens_pedido e pedidos usam VARCHAR id; lancamentos_financeiros usa UUID)
DELETE FROM lancamentos_financeiros WHERE descricao IN (
  'Venda coxinhas','Compra farinha','Venda brigadeiros','Compra açúcar e leite',
  'Venda variedades','Compra ovos','Bolo cenoura','Compra manteiga',
  'Buffet completo','Compra frango e catupiry','Venda rotina','Compra óleo',
  'Encomenda','Compra fermento','Grande evento','Compra materiais lote',
  'Reposição','Compra sal e fermento','Festa infantil','Compra chocolate',
  'Bolo casamento','Compra ingredientes premium'
);
DELETE FROM itens_pedido WHERE id LIKE 'ips_%';
DELETE FROM pedidos WHERE id LIKE 'ped_sim_%';

-- CLIENTES (se não existirem)
INSERT INTO clientes (id, nome, tipo_id, telefone, email, endereco)
VALUES
  ('cli_test_01', 'Lanchonete Central',  1, '(11) 99999-0001', 'central@email.com',  'Rua A, 123'),
  ('cli_test_02', 'Buffet Festa Linda',  2, '(11) 99999-0002', 'festa@email.com',    'Av B, 456'),
  ('cli_test_03', 'Maria Silva',         3, '(11) 99999-0003', 'maria@email.com',    'Rua C, 789')
ON CONFLICT (id) DO NOTHING;

-- PRODUTOS (se não existirem)
INSERT INTO produtos (id, nome, categoria_id, unidade_producao_id, tempo_producao_minutos, custo_producao_calculado, ativo, margem_lucro, preco_venda)
VALUES
  ('prod_test_01', 'Coxinha de Frango',   1, 5, 45, 3.50, true, 100, 8.00),
  ('prod_test_02', 'Brigadeiro Gourmet',  2, 5, 20, 1.20, true, 150, 3.00),
  ('prod_test_03', 'Bolo de Cenoura',     3, 1, 60, 18.00, true, 120, 45.00)
ON CONFLICT (id) DO NOTHING;

-- PEDIDOS ENTREGUES (status_id = 5) — últimos 30 dias
INSERT INTO pedidos (id, cliente_id, data_pedido, data_entrega_prevista, status_id, observacoes, valor_total, criado_by)
VALUES
  ('ped_sim_01', 'cli_test_01', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days', 5, 'Pedido regular', 120.00, 'Admin'),
  ('ped_sim_02', 'cli_test_02', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', 5, 'Festas', 240.00, 'Admin'),
  ('ped_sim_03', 'cli_test_01', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days', 5, 'Semanal', 80.00, 'Admin'),
  ('ped_sim_04', 'cli_test_03', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days', 5, 'Bolo aniversário', 180.00, 'Admin'),
  ('ped_sim_05', 'cli_test_02', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', 5, 'Buffet', 350.00, 'Admin'),
  ('ped_sim_06', 'cli_test_01', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days', 5, 'Rotina', 90.00, 'Admin'),
  ('ped_sim_07', 'cli_test_03', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 5, 'Encomenda', 75.00, 'Admin'),
  ('ped_sim_08', 'cli_test_02', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', 5, 'Grande evento', 520.00, 'Admin'),
  ('ped_sim_09', 'cli_test_01', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 5, 'Reposição', 65.00, 'Admin'),
  ('ped_sim_10', 'cli_test_02', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', 5, 'Festa infantil', 200.00, 'Admin'),
  ('ped_sim_11', 'cli_test_03', NOW() - INTERVAL '1 day', NOW(), 5, 'Bolo casamento', 450.00, 'Admin'),
  ('ped_sim_12', 'cli_test_01', NOW(), NOW() + INTERVAL '1 day', 2, 'Em produção', 110.00, 'Admin');

-- ITENS DOS PEDIDOS ENTREGUES
INSERT INTO itens_pedido (id, pedido_id, produto_id, quantidade_solicitada, preco_unitario)
VALUES
  ('ips_01', 'ped_sim_01', 'prod_test_01', 15, 8.00),
  ('ips_02', 'ped_sim_02', 'prod_test_02', 60, 3.00),
  ('ips_03', 'ped_sim_02', 'prod_test_01', 10, 8.00),
  ('ips_04', 'ped_sim_03', 'prod_test_01', 10, 8.00),
  ('ips_05', 'ped_sim_04', 'prod_test_03', 4, 45.00),
  ('ips_06', 'ped_sim_05', 'prod_test_02', 100, 3.00),
  ('ips_07', 'ped_sim_05', 'prod_test_01', 20, 8.00),
  ('ips_08', 'ped_sim_06', 'prod_test_01', 8, 8.00),
  ('ips_09', 'ped_sim_06', 'prod_test_02', 10, 3.00),
  ('ips_10', 'ped_sim_07', 'prod_test_01', 5, 8.00),
  ('ips_11', 'ped_sim_07', 'prod_test_02', 12, 3.00),
  ('ips_12', 'ped_sim_08', 'prod_test_02', 150, 3.00),
  ('ips_13', 'ped_sim_08', 'prod_test_01', 15, 8.00),
  ('ips_14', 'ped_sim_09', 'prod_test_01', 6, 8.00),
  ('ips_15', 'ped_sim_09', 'prod_test_02', 8, 3.00),
  ('ips_16', 'ped_sim_10', 'prod_test_02', 60, 3.00),
  ('ips_17', 'ped_sim_10', 'prod_test_01', 10, 8.00),
  ('ips_18', 'ped_sim_11', 'prod_test_03', 10, 45.00),
  ('ips_19', 'ped_sim_12', 'prod_test_01', 10, 8.00),
  ('ips_20', 'ped_sim_12', 'prod_test_02', 10, 3.00);

-- LANÇAMENTOS FINANCEIROS (receitas e despesas nos últimos 30 dias)
-- Nota: id é UUID (auto-gerado), criado_por é UUID REFERENCES auth.users(id) — omitidos
INSERT INTO lancamentos_financeiros (data_lancamento, valor, tipo, categoria_id, descricao, pedido_id)
VALUES
  ((NOW() - INTERVAL '28 days')::DATE, 120.00, 'receita', 1, 'Venda coxinhas', 'ped_sim_01'),
  ((NOW() - INTERVAL '28 days')::DATE, 45.00, 'despesa', 2, 'Compra farinha', NULL),
  ((NOW() - INTERVAL '25 days')::DATE, 240.00, 'receita', 1, 'Venda brigadeiros', 'ped_sim_02'),
  ((NOW() - INTERVAL '25 days')::DATE, 60.00, 'despesa', 2, 'Compra açúcar e leite', NULL),
  ((NOW() - INTERVAL '21 days')::DATE, 80.00, 'receita', 1, 'Venda variedades', 'ped_sim_03'),
  ((NOW() - INTERVAL '21 days')::DATE, 30.00, 'despesa', 2, 'Compra ovos', NULL),
  ((NOW() - INTERVAL '18 days')::DATE, 180.00, 'receita', 1, 'Bolo cenoura', 'ped_sim_04'),
  ((NOW() - INTERVAL '18 days')::DATE, 70.00, 'despesa', 2, 'Compra manteiga', NULL),
  ((NOW() - INTERVAL '15 days')::DATE, 350.00, 'receita', 1, 'Buffet completo', 'ped_sim_05'),
  ((NOW() - INTERVAL '15 days')::DATE, 95.00, 'despesa', 2, 'Compra frango e catupiry', NULL),
  ((NOW() - INTERVAL '12 days')::DATE, 90.00, 'receita', 1, 'Venda rotina', 'ped_sim_06'),
  ((NOW() - INTERVAL '12 days')::DATE, 25.00, 'despesa', 2, 'Compra óleo', NULL),
  ((NOW() - INTERVAL '10 days')::DATE, 75.00, 'receita', 1, 'Encomenda', 'ped_sim_07'),
  ((NOW() - INTERVAL '10 days')::DATE, 40.00, 'despesa', 2, 'Compra fermento', NULL),
  ((NOW() - INTERVAL '7 days')::DATE, 520.00, 'receita', 1, 'Grande evento', 'ped_sim_08'),
  ((NOW() - INTERVAL '7 days')::DATE, 120.00, 'despesa', 2, 'Compra materiais lote', NULL),
  ((NOW() - INTERVAL '5 days')::DATE, 65.00, 'receita', 1, 'Reposição', 'ped_sim_09'),
  ((NOW() - INTERVAL '5 days')::DATE, 20.00, 'despesa', 2, 'Compra sal e fermento', NULL),
  ((NOW() - INTERVAL '3 days')::DATE, 200.00, 'receita', 1, 'Festa infantil', 'ped_sim_10'),
  ((NOW() - INTERVAL '3 days')::DATE, 55.00, 'despesa', 2, 'Compra chocolate', NULL),
  ((NOW() - INTERVAL '1 day')::DATE, 450.00, 'receita', 1, 'Bolo casamento', 'ped_sim_11'),
  ((NOW() - INTERVAL '1 day')::DATE, 150.00, 'despesa', 2, 'Compra ingredientes premium', NULL);

-- ATUALIZAR CUSTO DE PRODUÇÃO DOS PRODUTOS (baseado nas fichas)
UPDATE produtos SET custo_producao_calculado = 3.50 WHERE id = 'prod_test_01'; -- Coxinha
UPDATE produtos SET custo_producao_calculado = 1.20 WHERE id = 'prod_test_02'; -- Brigadeiro
UPDATE produtos SET custo_producao_calculado = 18.00 WHERE id = 'prod_test_03'; -- Bolo

SELECT 'Dados de simulação inseridos com sucesso!' AS status;
