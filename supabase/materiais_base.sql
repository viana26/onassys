-- Ingredientes base para public.materiais
-- unidade_id resolvido via subquery na sigla de public.unidades (robusto a mudança de IDs)

insert into public.materiais (nome, unidade_id) values
-- Farinhas e fermentos
('Farinha de trigo', (select id from public.unidades where sigla = 'kg')),
('Farinha de rosca', (select id from public.unidades where sigla = 'kg')),
('Fermento biológico seco', (select id from public.unidades where sigla = 'g')),
('Fermento em pó (químico)', (select id from public.unidades where sigla = 'g')),

-- Açúcares
('Açúcar refinado', (select id from public.unidades where sigla = 'kg')),
('Açúcar cristal', (select id from public.unidades where sigla = 'kg')),
('Açúcar de confeiteiro', (select id from public.unidades where sigla = 'kg')),

-- Gorduras e óleos
('Óleo de soja', (select id from public.unidades where sigla = 'L')),
('Óleo para fritura', (select id from public.unidades where sigla = 'L')),
('Manteiga', (select id from public.unidades where sigla = 'kg')),
('Margarina', (select id from public.unidades where sigla = 'kg')),

-- Ovos e laticínios
('Ovos', (select id from public.unidades where sigla = 'un')),
('Leite integral', (select id from public.unidades where sigla = 'L')),
('Leite condensado', (select id from public.unidades where sigla = 'g')),
('Creme de leite', (select id from public.unidades where sigla = 'g')),
('Requeijão cremoso', (select id from public.unidades where sigla = 'g')),
('Catupiry (ou similar)', (select id from public.unidades where sigla = 'g')),

-- Queijos e frios
('Queijo mussarela', (select id from public.unidades where sigla = 'kg')),
('Queijo prato', (select id from public.unidades where sigla = 'kg')),
('Presunto', (select id from public.unidades where sigla = 'kg')),

-- Carnes
('Frango (peito, para desfiar)', (select id from public.unidades where sigla = 'kg')),
('Carne moída', (select id from public.unidades where sigla = 'kg')),

-- Verduras, legumes e temperos frescos
('Cebola', (select id from public.unidades where sigla = 'kg')),
('Alho', (select id from public.unidades where sigla = 'kg')),
('Tomate', (select id from public.unidades where sigla = 'kg')),
('Batata inglesa', (select id from public.unidades where sigla = 'kg')),
('Cheiro-verde (maço)', (select id from public.unidades where sigla = 'un')),
('Milho verde (conserva)', (select id from public.unidades where sigla = 'g')),
('Ervilha (conserva)', (select id from public.unidades where sigla = 'g')),

-- Chocolates e coberturas
('Chocolate em barra (cobertura)', (select id from public.unidades where sigla = 'kg')),
('Chocolate em pó 50%', (select id from public.unidades where sigla = 'g')),
('Achocolatado em pó', (select id from public.unidades where sigla = 'g')),
('Chocolate granulado', (select id from public.unidades where sigla = 'g')),
('Coco ralado', (select id from public.unidades where sigla = 'g')),
('Doce de leite', (select id from public.unidades where sigla = 'g')),
('Goiabada', (select id from public.unidades where sigla = 'kg')),

-- Massa pronta
('Massa de pastel (rolo/kg)', (select id from public.unidades where sigla = 'kg')),

-- Temperos e especiarias
('Sal refinado', (select id from public.unidades where sigla = 'kg')),
('Pimenta-do-reino', (select id from public.unidades where sigla = 'g')),
('Orégano', (select id from public.unidades where sigla = 'g')),
('Colorau / páprica doce', (select id from public.unidades where sigla = 'g')),
('Canela em pó', (select id from public.unidades where sigla = 'g')),
('Cravo-da-índia', (select id from public.unidades where sigla = 'g')),
('Caldo de galinha (tablete/pó)', (select id from public.unidades where sigla = 'g')),

-- Essências e líquidos aromáticos
('Essência de baunilha', (select id from public.unidades where sigla = 'mL'));