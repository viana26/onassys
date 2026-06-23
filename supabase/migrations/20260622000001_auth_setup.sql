-- Migration: auth_setup.sql
-- Configuração de autenticação para o sistema Mini-Factory
-- Usa Supabase Auth nativo + RLS (compatível com plano Free)
-- Criado em: 2026-06-22

-- =====================================================
-- HABILITAR EXTENSÃO
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA DE CONFIGURAÇÃO DO SISTEMA
-- Controla se o primeiro admin foi criado
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracao_sistema (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    primeiro_acesso_concluido BOOLEAN NOT NULL DEFAULT false,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insere registro inicial
INSERT INTO public.configuracao_sistema (id, primeiro_acesso_concluido)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABELA DE PERFIS (vinculada a auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    nivel VARCHAR(50) NOT NULL DEFAULT 'admin',
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION atualizar_data_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função RPC: Verificar se sistema está configurado
CREATE OR REPLACE FUNCTION is_sistema_configurado()
RETURNS BOOLEAN AS $$
DECLARE
    config BOOLEAN;
BEGIN
    SELECT primeiro_acesso_concluido INTO config 
    FROM public.configuracao_sistema 
    WHERE id = 1;
    
    RETURN COALESCE(config, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC: Contar usuários
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS INTEGER AS $$
DECLARE
    total INTEGER;
BEGIN
    SELECT COUNT(*) INTO total FROM auth.users;
    RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC: Marcar primeiro acesso como concluído
CREATE OR REPLACE FUNCTION concluir_primeiro_acesso()
RETURNS VOID AS $$
BEGIN
    UPDATE public.configuracao_sistema 
    SET primeiro_acesso_concluido = true 
    WHERE id = 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GATILHOS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_configuracao_updated ON public.configuracao_sistema;
CREATE TRIGGER trigger_configuracao_updated
    BEFORE UPDATE ON public.configuracao_sistema
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_update();

DROP TRIGGER IF EXISTS trigger_perfis_updated ON public.perfis;
CREATE TRIGGER trigger_perfis_updated
    BEFORE UPDATE ON public.perfis
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_data_update();

-- =====================================================
-- POLICIES RLS
-- =====================================================
ALTER TABLE public.configuracao_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver o status (para verificar se precisa configurar)
DROP POLICY IF EXISTS "Configuração visível para todos" ON public.configuracao_sistema;
CREATE POLICY "Configuração visível para todos"
    ON public.configuracao_sistema
    FOR SELECT
    TO public
    USING (true);

-- Apenas usuários autenticados podem atualizar configuração
DROP POLICY IF EXISTS "Configuração atualizável por autenticados" ON public.configuracao_sistema;
CREATE POLICY "Configuração atualizável por autenticados"
    ON public.configuracao_sistema
    FOR UPDATE
    TO authenticated
    USING (true);

-- Qualquer usuário autenticado pode ver e gerenciar perfis
DROP POLICY IF EXISTS "Perfis visíveis para autenticados" ON public.perfis;
CREATE POLICY "Perfis visíveis para autenticados"
    ON public.perfis
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Perfis atualizáveis por autenticados" ON public.perfis;
CREATE POLICY "Perfis atualizáveis por autenticados"
    ON public.perfis
    FOR ALL
    TO authenticated
    USING (true);

-- =====================================================
-- VISÃO: Status do sistema
-- =====================================================
CREATE OR REPLACE VIEW public.status_sistema AS
SELECT 
    get_user_count() AS total_usuarios,
    is_sistema_configurado() AS sistema_configurado;