-- Adicionar permissão de limpar histórico de movimentações (somente admin)

-- Inserir a permissão
INSERT INTO permissoes (chave, nome, grupo)
VALUES ('estoque.limpar_historico', 'Limpar Histórico de Movimentações', 'Estoque')
ON CONFLICT DO NOTHING;

-- Vincular ao perfil Admin (id=1) e Gerente (id=2)
DO $$
DECLARE
  perm_id integer;
BEGIN
  SELECT id INTO perm_id FROM permissoes WHERE chave = 'estoque.limpar_historico';
  IF perm_id IS NOT NULL THEN
    INSERT INTO perfis_permissoes (perfil_id, permissao_id)
    VALUES (1, perm_id), (2, perm_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
