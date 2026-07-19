-- =====================================================
-- APAGAR SCHEMA PÚBLICO E USUÁRIOS DO AUTH
-- Usado para simular um banco de dados novo/vazio
-- =====================================================

-- Limpa todos os logins criados no Supabase Auth
TRUNCATE auth.users CASCADE;

-- Apaga todo o schema público
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
