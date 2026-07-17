-- Lancamentos Financeiro: adicionar INSERT, UPDATE, DELETE policies
-- Sem essas políticas, o RLS bloqueia gravações no banco

DROP POLICY IF EXISTS "lancamentos_financeiro_insert" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_insert" ON public.lancamentos_financeiros FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "lancamentos_financeiro_update" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_update" ON public.lancamentos_financeiros FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "lancamentos_financeiro_delete" ON public.lancamentos_financeiros;
CREATE POLICY "lancamentos_financeiro_delete" ON public.lancamentos_financeiros FOR DELETE TO authenticated USING (true);
