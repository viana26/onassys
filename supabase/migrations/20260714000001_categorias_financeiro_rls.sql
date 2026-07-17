-- Categorias Financeiro: adicionar INSERT, UPDATE, DELETE policies
-- O SELECT já existe, mas faltam as políticas de escrita

DROP POLICY IF EXISTS "categorias_financeiro_insert" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_insert" ON public.categorias_financeiro FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "categorias_financeiro_update" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_update" ON public.categorias_financeiro FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "categorias_financeiro_delete" ON public.categorias_financeiro;
CREATE POLICY "categorias_financeiro_delete" ON public.categorias_financeiro FOR DELETE TO authenticated USING (true);
