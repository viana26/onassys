-- Adiciona o tipo de movimentação de Ajuste de Estoque (Saída)
INSERT INTO public.tipos_movimentacao (nome, natureza, entidade)
VALUES ('Ajuste Estoque (Saída)', 'saida', 'ambos')
ON CONFLICT (nome) DO NOTHING;

-- Corrige as movimentações antigas (tipo_id = 3 com quantidade negativa):
-- Aponta para o novo tipo e torna a quantidade positiva
DO $$
DECLARE
    id_ajuste_saida INT;
BEGIN
    SELECT id INTO id_ajuste_saida 
    FROM public.tipos_movimentacao 
    WHERE nome = 'Ajuste Estoque (Saída)';

    IF id_ajuste_saida IS NOT NULL THEN
        UPDATE public.movimentacoes_produtos
        SET 
            tipo_id = id_ajuste_saida,
            quantidade = ABS(quantidade)
        WHERE tipo_id = 3 AND quantidade < 0;
    END IF;
END $$;
