-- =====================================================
-- Migration: Dados da Empresa (NFSe / Relatórios)
-- =====================================================

ALTER TABLE public.configuracao_sistema
  ADD COLUMN IF NOT EXISTS nome_empresa VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
  ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(30),
  ADD COLUMN IF NOT EXISTS logradouro VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bairro VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
  ADD COLUMN IF NOT EXISTS uf CHAR(2),
  ADD COLUMN IF NOT EXISTS cep VARCHAR(10),
  ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);

-- Bucket para logo da empresa (público)
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('logo_empresa', 'logo_empresa', true, false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket logo_empresa
DROP POLICY IF EXISTS "logos_select" ON storage.objects;
CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'logo_empresa');

DROP POLICY IF EXISTS "logos_insert" ON storage.objects;
CREATE POLICY "logos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logo_empresa');

DROP POLICY IF EXISTS "logos_delete" ON storage.objects;
CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'logo_empresa');
