DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'movimentacoes_produtos' AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.movimentacoes_produtos
    ADD COLUMN usuario_id UUID REFERENCES public.perfis_usuario(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mov_prod_usuario ON public.movimentacoes_produtos(usuario_id);
