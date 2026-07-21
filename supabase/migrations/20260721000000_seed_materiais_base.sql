-- =====================================================
-- SEED: Ingredientes base para nova instalação
-- Idempotente: só insere se a tabela estiver vazia
-- =====================================================

INSERT INTO public.materiais (id, nome, unidade_id)
SELECT
  'mat_' || substr(md5(random()::text), 1, 7),
  v.nome,
  (SELECT id FROM public.unidades WHERE sigla = v.sigla)
FROM (VALUES
  ('Farinha de trigo', 'kg'),
  ('Farinha de rosca', 'kg'),
  ('Fermento biológico seco', 'g'),
  ('Fermento em pó (químico)', 'g'),
  ('Açúcar refinado', 'kg'),
  ('Açúcar cristal', 'kg'),
  ('Açúcar de confeiteiro', 'kg'),
  ('Óleo de soja', 'L'),
  ('Óleo para fritura', 'L'),
  ('Manteiga', 'kg'),
  ('Margarina', 'kg'),
  ('Ovos', 'un'),
  ('Leite integral', 'L'),
  ('Leite condensado', 'g'),
  ('Creme de leite', 'g'),
  ('Requeijão cremoso', 'g'),
  ('Catupiry (ou similar)', 'g'),
  ('Queijo mussarela', 'kg'),
  ('Queijo prato', 'kg'),
  ('Presunto', 'kg'),
  ('Frango (peito, para desfiar)', 'kg'),
  ('Carne moída', 'kg'),
  ('Cebola', 'kg'),
  ('Alho', 'kg'),
  ('Tomate', 'kg'),
  ('Batata inglesa', 'kg'),
  ('Cheiro-verde (maço)', 'un'),
  ('Milho verde (conserva)', 'g'),
  ('Ervilha (conserva)', 'g'),
  ('Chocolate em barra (cobertura)', 'kg'),
  ('Chocolate em pó 50%', 'g'),
  ('Achocolatado em pó', 'g'),
  ('Chocolate granulado', 'g'),
  ('Coco ralado', 'g'),
  ('Doce de leite', 'g'),
  ('Goiabada', 'kg'),
  ('Massa de pastel (rolo/kg)', 'kg'),
  ('Sal refinado', 'kg'),
  ('Pimenta-do-reino', 'g'),
  ('Orégano', 'g'),
  ('Colorau / páprica doce', 'g'),
  ('Canela em pó', 'g'),
  ('Cravo-da-índia', 'g'),
  ('Caldo de galinha (tablete/pó)', 'g'),
  ('Essência de baunilha', 'mL')
) AS v(nome, sigla)
WHERE NOT EXISTS (SELECT 1 FROM public.materiais LIMIT 1);
