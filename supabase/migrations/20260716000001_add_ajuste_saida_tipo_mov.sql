-- 1. Renomeia o tipo original de 'Ajuste Estoque' para 'Ajuste Estoque (Entrada)' se existir
UPDATE public.tipos_movimentacao
SET nome = 'Ajuste Estoque (Entrada)'
WHERE nome = 'Ajuste Estoque';

-- 2. Adiciona o tipo de movimentação de Ajuste de Estoque (Saída)
INSERT INTO public.tipos_movimentacao (nome, natureza, entidade)
VALUES ('Ajuste Estoque (Saída)', 'saida', 'ambos')
ON CONFLICT (nome) DO NOTHING;

-- 3. Garante a criação de Ajuste Estoque (Entrada) caso não existisse
INSERT INTO public.tipos_movimentacao (nome, natureza, entidade)
VALUES ('Ajuste Estoque (Entrada)', 'entrada', 'ambos')
ON CONFLICT (nome) DO NOTHING;

-- 4. Corrige as movimentações antigas (com quantidade negativa):
-- Aponta para o novo tipo e torna a quantidade positiva
DO $$
DECLARE
    id_ajuste_saida INT;
    id_ajuste_entrada INT;
BEGIN
    SELECT id INTO id_ajuste_entrada 
    FROM public.tipos_movimentacao 
    WHERE nome = 'Ajuste Estoque (Entrada)';

    SELECT id INTO id_ajuste_saida 
    FROM public.tipos_movimentacao 
    WHERE nome = 'Ajuste Estoque (Saída)';

    IF id_ajuste_saida IS NOT NULL AND id_ajuste_entrada IS NOT NULL THEN
        UPDATE public.movimentacoes_produtos
        SET 
            tipo_id = id_ajuste_saida,
            quantidade = ABS(quantidade)
        WHERE tipo_id = id_ajuste_entrada AND quantidade < 0;
    END IF;
END $$;
