ALTER TABLE public.movimentacoes_produtos
ADD COLUMN usuario_id UUID REFERENCES public.perfis_usuario(id);

CREATE INDEX IF NOT EXISTS idx_mov_prod_usuario ON public.movimentacoes_produtos(usuario_id);
