-- ============================================
-- TEST DATA â€” Insert + Delete pattern
-- Run this to populate, test, then run cleanup
-- ============================================

-- 1) FORNECEDORES (precisa ter para materiais)
INSERT INTO fornecedores (nome_fantasia, contato, telefone)
VALUES
  ('AtacadÃ£o Central', 'JoÃ£o', '(11) 3000-1111'),
  ('Distribuidora de Farinhas', 'Maria', '(11) 3000-2222'),
  ('LaticÃ­nios SÃ£o Paulo', 'Carlos', '(11) 3000-3333');
-- IDs: 1, 2, 3

-- 2) MATERIAIS
INSERT INTO materiais (id, nome, unidade_id, quantidade_atual, quantidade_minima, custo_unitario, fornecedor_id)
VALUES
  ('mat_test_01', 'Farinha de trigo',  1, 50,   10,  5.50,  2),
  ('mat_test_02', 'AÃ§Ãºcar refinado',   1, 30,    5,  4.20,  1),
  ('mat_test_03', 'Leite integral',    3, 20,    5,  6.00,  3),
  ('mat_test_04', 'Manteiga',          1, 10,    2,  22.00, 3),
  ('mat_test_05', 'Ovos',              5, 120,  24,  0.80,  1),
  ('mat_test_06', 'Ã“leo de soja',      3, 15,    5,  8.50,  1),
  ('mat_test_07', 'Sal',               2, 500, 100,  0.03,  1),
  ('mat_test_08', 'Fermento quÃ­mico',  2, 200,  50,  0.12,  2),
  ('mat_test_09', 'Frango desfiado',   1, 8,     3,  18.00, 1),
  ('mat_test_10', 'Catupiry',          1, 5,     2,  25.00, 3);

-- 3) PRODUTOS
INSERT INTO produtos (id, nome, categoria_id, unidade_producao_id, tempo_producao_minutos, custo_producao_calculado, ativo, margem_lucro, preco_venda)
VALUES
  ('prod_test_01', 'Coxinha de Frango',   1, 5, 45, 0, true, 100, 8.00),
  ('prod_test_02', 'Brigadeiro Gourmet',  2, 5, 20, 0, true, 150, 3.00),
  ('prod_test_03', 'Bolo de Cenoura',     3, 1, 60, 0, true, 120, 45.00);

-- 4) FICHAS TÃ‰CNICAS
INSERT INTO fichas_tecnicas (id, produto_id, material_id, quantidade_necessaria, unidade_id)
VALUES
  -- Coxinha (10 unidades)
  ('ft_test_01', 'prod_test_01', 'mat_test_01', 0.500, 1),  -- 500g farinha
  ('ft_test_02', 'prod_test_01', 'mat_test_09', 0.300, 1),  -- 300g frango
  ('ft_test_03', 'prod_test_01', 'mat_test_10', 0.100, 1),  -- 100g catupiry
  ('ft_test_04', 'prod_test_01', 'mat_test_06', 0.100, 3),  -- 100ml Ã³leo
  ('ft_test_05', 'prod_test_01', 'mat_test_05', 1.000, 5),  -- 1 ovo
  -- Brigadeiro (10 unidades)
  ('ft_test_06', 'prod_test_02', 'mat_test_02', 0.200, 1),  -- 200g aÃ§Ãºcar
  ('ft_test_07', 'prod_test_02', 'mat_test_03', 0.200, 3),  -- 200ml leite
  ('ft_test_08', 'prod_test_02', 'mat_test_04', 0.050, 1),  -- 50g manteiga
  -- Bolo de Cenoura (1 kg)
  ('ft_test_09', 'prod_test_03', 'mat_test_01', 0.300, 1),  -- 300g farinha
  ('ft_test_10', 'prod_test_03', 'mat_test_02', 0.250, 1),  -- 250g aÃ§Ãºcar
  ('ft_test_11', 'prod_test_03', 'mat_test_06', 0.150, 3),  -- 150ml Ã³leo
  ('ft_test_12', 'prod_test_03', 'mat_test_05', 3.000, 5);  -- 3 ovos

-- 5) CLIENTES
INSERT INTO clientes (id, nome, tipo_id, telefone, email, endereco)
VALUES
  ('cli_test_01', 'Lanchonete Central',  1, '(11) 99999-0001', 'central@email.com',  'Rua A, 123'),
  ('cli_test_02', 'Buffet Festa Linda',  2, '(11) 99999-0002', 'festa@email.com',    'Av B, 456'),
  ('cli_test_03', 'Maria Silva',         3, '(11) 99999-0003', 'maria@email.com',    'Rua C, 789');

-- 6) PEDIDOS
INSERT INTO pedidos (id, cliente_id, data_entrega_prevista, status_id, observacoes, valor_total, criado_by)
VALUES
  ('ped_test_01', 'cli_test_01', NOW() + INTERVAL '1 day',  2, 'Entrega urgente',    80.00, 'Admin'),
  ('ped_test_02', 'cli_test_02', NOW() + INTERVAL '2 days', 2, 'Festas de aniversÃ¡rio', 90.00, 'Admin'),
  ('ped_test_03', 'cli_test_03', NOW() + INTERVAL '5 days', 1, 'Bolo para sÃ¡bado',   45.00, 'Admin');

-- 7) ITENS PEDIDO
INSERT INTO itens_pedido (id, pedido_id, produto_id, quantidade_solicitada, quantidade_produzida, preco_unitario)
VALUES
  ('ip_test_01', 'ped_test_01', 'prod_test_01', 10, 0, 8.00),
  ('ip_test_02', 'ped_test_02', 'prod_test_02', 30, 0, 3.00),
  ('ip_test_03', 'ped_test_03', 'prod_test_03', 1,  0, 45.00);

-- 8) MOV MATERIAIS
INSERT INTO movimentacoes_materiais (id, material_id, tipo_id, quantidade, custo_unitario, valor_pago)
VALUES
  ('movm_test_01', 'mat_test_01', 1, 50,  5.50, 275.00),
  ('movm_test_02', 'mat_test_02', 1, 30,  4.20, 126.00),
  ('movm_test_03', 'mat_test_05', 1, 120, 0.80, 96.00);

-- 9) ESTOQUE PRODUTOS (prontos)
INSERT INTO estoque_produtos (id, produto_id, quantidade_disponivel, quantidade_minima, lote, data_validade)
VALUES
  ('est_test_01', 'prod_test_01', 30, 10, 'LOTE-T1', NOW() + INTERVAL '3 days'),
  ('est_test_02', 'prod_test_02', 15, 5,  'LOTE-T2', NOW() + INTERVAL '5 days');

SELECT 'TEST DATA INSERTED' AS status;

