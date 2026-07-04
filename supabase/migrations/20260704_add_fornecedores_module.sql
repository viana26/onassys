-- ============================================
-- Fornecedores Module: ativo column + perms
-- ============================================
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO public.permissoes (chave, nome, grupo) VALUES
    ('fornecedores.ver', 'Ver Fornecedores', 'Fornecedores'),
    ('fornecedores.criar', 'Criar Fornecedores', 'Fornecedores'),
    ('fornecedores.editar', 'Editar Fornecedores', 'Fornecedores'),
    ('fornecedores.excluir', 'Excluir Fornecedores', 'Fornecedores')
ON CONFLICT (chave) DO NOTHING;

-- Admin: todas (inclui automaticamente via INSERT geral abaixo)
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Admin'
  AND perm.chave LIKE 'fornecedores.%'
ON CONFLICT DO NOTHING;

-- Gerente: todas
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Gerente'
  AND perm.chave LIKE 'fornecedores.%'
ON CONFLICT DO NOTHING;

-- Operador: ver + criar + editar (sem excluir)
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Operador'
  AND perm.chave IN ('fornecedores.ver', 'fornecedores.criar', 'fornecedores.editar')
ON CONFLICT DO NOTHING;

-- Visualizador: apenas ver
INSERT INTO public.perfis_permissoes (perfil_id, permissao_id)
SELECT p.id, perm.id FROM public.perfis p, public.permissoes perm
WHERE p.nome = 'Visualizador'
  AND perm.chave = 'fornecedores.ver'
ON CONFLICT DO NOTHING;
