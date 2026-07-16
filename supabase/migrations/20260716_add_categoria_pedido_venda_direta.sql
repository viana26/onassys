-- Novas categorias de receita
INSERT INTO public.categorias_financeiro (nome, tipo, cor) VALUES
    ('Encomendas Personalizadas', 'receita', '#0d9488'),
    ('Buffet / Eventos', 'receita', '#7c3aed'),
    ('Taxa de Entrega', 'receita', '#ea580c'),
    ('Outras Receitas', 'receita', '#6b7280')
ON CONFLICT (nome) DO NOTHING;

-- categoria_receita_id em tipos_cliente
ALTER TABLE public.tipos_cliente
ADD COLUMN IF NOT EXISTS categoria_receita_id INTEGER REFERENCES public.categorias_financeiro(id);

-- categoria_receita_id em pedidos
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS categoria_receita_id INTEGER REFERENCES public.categorias_financeiro(id);

-- Novo tipo de movimentacao: Venda Direta
INSERT INTO public.tipos_movimentacao (nome, natureza, entidade) VALUES
    ('Venda Direta', 'saida', 'produto')
ON CONFLICT (nome) DO NOTHING;

-- Mapear tipos de cliente para categorias de receita padrao
UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Venda de Produtos'
) WHERE nome = 'Lanchonete / Revenda' AND categoria_receita_id IS NULL;

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Buffet / Eventos'
) WHERE nome = 'Buffet / Salão de Festas' AND categoria_receita_id IS NULL;

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Encomendas Personalizadas'
) WHERE nome = 'Pessoa Particular' AND categoria_receita_id IS NULL;

UPDATE public.tipos_cliente SET categoria_receita_id = (
    SELECT id FROM public.categorias_financeiro WHERE nome = 'Outras Receitas'
) WHERE nome = 'Outros Convênios' AND categoria_receita_id IS NULL;
