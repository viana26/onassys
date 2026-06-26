-- =====================================================
-- Recovery Code: redefinição de senha sem email
-- =====================================================

-- Código de emergência do sistema (admin)
ALTER TABLE public.configuracao_sistema ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;

-- Código individual por usuário
ALTER TABLE public.perfis_usuario ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;
ALTER TABLE public.perfis_usuario ADD COLUMN IF NOT EXISTS recovery_code_shown BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION gerar_codigo_recovery()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  UPDATE configuracao_sistema SET recovery_code_hash = crypt(code, gen_salt('bf')) WHERE id = 1;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION gerar_codigo_recovery_usuario(p_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  UPDATE perfis_usuario SET recovery_code_hash = crypt(code, gen_salt('bf')) WHERE id = p_user_id;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION redefinir_senha_recovery(p_email TEXT, p_codigo TEXT, p_nova_senha TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  hash_sistema TEXT;
  hash_usuario TEXT;
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = p_email;
  IF uid IS NULL THEN RETURN FALSE; END IF;

  SELECT recovery_code_hash INTO hash_usuario FROM perfis_usuario WHERE id = uid;
  IF hash_usuario IS NOT NULL AND crypt(p_codigo, hash_usuario) = hash_usuario THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  SELECT recovery_code_hash INTO hash_sistema FROM configuracao_sistema WHERE id = 1;
  IF hash_sistema IS NOT NULL AND crypt(p_codigo, hash_sistema) = hash_sistema THEN
    UPDATE auth.users SET encrypted_password = crypt(p_nova_senha, gen_salt('bf')) WHERE id = uid;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;