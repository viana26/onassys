-- Remove campos lote e data_validade da tabela estoque_produtos
-- Esses campos nao agregam valor ao sistema e causavam confusao
-- (multiplas entradas de estoque para o mesmo produto)

ALTER TABLE estoque_produtos DROP COLUMN IF EXISTS data_validade;
ALTER TABLE estoque_produtos DROP COLUMN IF EXISTS lote;
