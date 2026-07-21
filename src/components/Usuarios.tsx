import React, { useState, useEffect, useCallback } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Users as UsersIcon, Plus, Shield, AlertCircle, Trash2, AlertTriangle, Key, Pencil, RefreshCw } from 'lucide-react';
import { supabase, supabaseAdmin, signOut } from '../lib/supabaseClient';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import SelectSearch from './SelectSearch';

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface UsuarioRow {
  id: string;
  email: string;
  nome?: string;
  perfil_id: number;
  ativo: boolean;
  criado_em: string;
}

interface UsuariosProps {
  store: MiniFactoryStore;
}

export default function Usuarios({ store }: UsuariosProps) {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [perfilId, setPerfilId] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ user: UsuarioRow; isSelf: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetPassUser, setResetPassUser] = useState<UsuarioRow | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [editUser, setEditUser] = useState<UsuarioRow | null>(null);
  const [showGenerated, setShowGenerated] = useState(false);

  const handleGeneratePassword = useCallback(() => {
    const pwd = generatePassword();
    setSenha(pwd);
    setShowGenerated(true);
    setTimeout(() => setShowGenerated(false), 5000);
  }, []);

  const handleGenerateResetPassword = useCallback(() => {
    const pwd = generatePassword();
    setResetPass(pwd);
    setResetConfirm(pwd);
    setShowGenerated(true);
    setTimeout(() => setShowGenerated(false), 5000);
  }, []);

  useEffect(() => { carregarUsuarios(); }, [store]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const { data: perfis } = await supabase.from('perfis_usuario').select('*');

      const rows: UsuarioRow[] = (users || []).map(u => {
        const p = (perfis || []).find((pu: any) => pu.id === u.id);
        return {
          id: u.id,
          email: u.email || '',
          nome: u.user_metadata?.nome || u.email || 'Sem nome',
          perfil_id: p?.perfil_id || 3,
          ativo: p?.ativo ?? true,
          criado_em: u.created_at || '',
        };
      });
      setUsuarios(rows);
    } catch (e) {
      console.error('Erro ao carregar usuários:', e);
    }
    setLoading(false);
  };

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email, password: senha, email_confirm: true, user_metadata: { nome }
      });
      if (signUpError) { setError(signUpError.message); setSaving(false); return; }
      if (data.user) {
        await supabase.from('perfis_usuario').upsert({
          id: data.user.id, perfil_id: perfilId, ativo: true
        });
      }
      setShowModal(false);
      setEmail(''); setSenha(''); setNome(''); setPerfilId(1);
      carregarUsuarios();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar usuário');
    }
    setSaving(false);
  };

  const toggleAtivo = async (userId: string, ativo: boolean) => {
    await supabase.from('perfis_usuario').update({ ativo: !ativo }).eq('id', userId);
    carregarUsuarios();
  };

  const confirmarExclusao = (user: UsuarioRow) => {
    setDeleteConfirm({ user, isSelf: user.id === store.currentUserId });
  };

  const excluirUsuario = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const { user, isSelf } = deleteConfirm;
    try {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      await supabase.from('perfis_usuario').delete().eq('id', user.id);
      setDeleteConfirm(null);
      carregarUsuarios();
      if (isSelf) {
        await signOut();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir usuário');
    }
    setDeleting(false);
  };

  const usuariosOrdenados = [...usuarios].sort((a, b) => {
    if (a.id === store.currentUserId) return -1;
    if (b.id === store.currentUserId) return 1;
    return 0;
  });

  const { sortedItems: sortedUsuarios, requestSort, sortConfig } = useSortableData(usuariosOrdenados, 'nome');

  const redefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetPass !== resetConfirm) { setResetError('As senhas não coincidem'); return; }
    if (resetPass.length < 6) { setResetError('A senha deve ter pelo menos 6 caracteres'); return; }
    if (!resetPassUser) return;
    setResetSaving(true);
    try {
      await supabaseAdmin.auth.admin.updateUserById(resetPassUser.id, { password: resetPass });
      setResetPassUser(null);
      setResetPass('');
      setResetConfirm('');
    } catch (e) {
      setResetError(e instanceof Error ? e.message : 'Erro ao redefinir senha');
    }
    setResetSaving(false);
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !nome.trim()) return;
    setError('');
    setSaving(true);
    try {
      await supabaseAdmin.auth.admin.updateUserById(editUser.id, { user_metadata: { nome: nome.trim() } });
      await supabase.from('perfis_usuario').update({ nome: nome.trim(), perfil_id: perfilId }).eq('id', editUser.id);
      setEditUser(null);
      setNome('');
      setPerfilId(1);
      setError('');
      carregarUsuarios();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar usuário');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-amber-700 dark:text-amber-400" />
            <h2 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Usuários</h2>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Gerencie usuários e níveis de acesso</p>
        </div>
        {store.hasPermission('usuarios.criar') && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition text-xs font-sans">
            <Plus size={15} /> Novo Usuário
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#f0eade] dark:bg-[#130b04] rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#f8f5ee] dark:bg-[#130b04]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton sortKey="nome" label="Usuário" sortConfig={sortConfig as any} onSort={requestSort as any} /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton sortKey="perfil_id" label="Perfil" sortConfig={sortConfig as any} onSort={requestSort as any} /></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton sortKey="ativo" label="Status" sortConfig={sortConfig as any} onSort={requestSort as any} /></th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebdcc9] dark:divide-[#2e1a0a]">
              {sortedUsuarios.map(user => (
                <tr key={user.id} className={`hover:bg-[#f8f5ee]/50 dark:hover:bg-[#130b04]/50 transition ${user.id === store.currentUserId ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.id === store.currentUserId && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">(Você)</span>
                      )}
                      <div>
                        <p className="font-medium text-[#2e2315] dark:text-amber-50">{user.nome}</p>
                        <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                      <Shield size={12} /> {store.perfilNome(user.perfil_id)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {store.hasPermission('usuarios.editar') ? (
                      <button onClick={() => toggleAtivo(user.id, user.ativo)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${
                          user.ativo
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                        user.ativo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {store.hasPermission('usuarios.editar') && (
                        <button onClick={() => { setEditUser(user); setNome(user.nome || ''); setEmail(user.email); setPerfilId(user.perfil_id); setError(''); }}
                          className="p-1.5 text-amber-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                          title="Editar usuário">
                          <Pencil size={16} />
                        </button>
                      )}
                      {store.hasPermission('usuarios.excluir') && (
                        <button onClick={() => confirmarExclusao(user)}
                          className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      )}
                      {store.hasPermission('usuarios.editar') && (
                        <button onClick={() => {
                          setResetPassUser(user);
                          setResetPass('');
                          setResetConfirm('');
                          setResetError('');
                        }}
                          className="p-1.5 text-amber-600 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition"
                          title="Redefinir senha">
                          <Key size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usuarios.length === 0 && (
            <div className="p-8 text-center text-[#5c4a37]/60 dark:text-amber-100/50">Nenhum usuário encontrado</div>
          )}
        </div>
      )}

      {(showModal || editUser) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
            <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50 mb-4">{editUser ? 'Editar Usuário' : 'Criar Novo Usuário'}</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>
            )}

            <form onSubmit={editUser ? salvarEdicao : criarUsuario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Nome</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                  className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={!!editUser}
                  className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 read-only:opacity-60 read-only:cursor-not-allowed" />
              </div>
              {!editUser && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100">Senha</label>
                    <button type="button" onClick={handleGeneratePassword}
                      className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-0.5 transition">
                      <RefreshCw size={10} /> Gerar
                    </button>
                  </div>
                  <input type={showGenerated ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} required minLength={6}
                    className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Perfil de Acesso</label>
                <SelectSearch value={String(perfilId)} onChange={v => { if (editUser?.id !== store.currentUserId) setPerfilId(Number(v)); }} options={store.perfis.map(p => ({ value: String(p.id), label: `${p.nome} — ${p.descricao}` }))} placeholder="Perfil de acesso" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditUser(null); setNome(''); setEmail(''); setSenha(''); setPerfilId(1); setError(''); }}
                  className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl transition disabled:cursor-not-allowed">
                  {saving ? 'Salvando...' : (editUser ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50">
                {deleteConfirm.isSelf ? 'Excluir seu próprio acesso?' : 'Excluir Usuário?'}
              </h3>
            </div>
            <p className="text-sm text-[#5c4a37] dark:text-amber-100/70 mb-2">
              O usuário <strong>{deleteConfirm.user.nome}</strong> ({deleteConfirm.user.email}) será removido permanentemente do sistema.
            </p>
            {deleteConfirm.isSelf && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4 font-semibold">
                Você está prestes a excluir seu próprio usuário. Esta ação irá encerrar sua sessão e o sistema voltará para a tela de configuração inicial.
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setDeleteConfirm(null); setError(''); }}
                className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={excluirUsuario} disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white font-semibold rounded-xl transition disabled:cursor-not-allowed">
                {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPassUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <Key size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50">Redefinir Senha</h3>
                <p className="text-xs text-[#5c4a37] dark:text-amber-100/70">
                  {resetPassUser.nome} ({resetPassUser.email})
                </p>
              </div>
            </div>

            {resetError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{resetError}</div>
            )}

            <form onSubmit={redefinirSenha} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#5c4a37] dark:text-amber-100">Nova senha</label>
                  <button type="button" onClick={handleGenerateResetPassword}
                    className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-500 flex items-center gap-0.5 transition">
                    <RefreshCw size={10} /> Gerar
                  </button>
                </div>
                <input type={showGenerated ? 'text' : 'password'} value={resetPass} onChange={e => setResetPass(e.target.value)} required minLength={6} placeholder="Nova senha"
                  className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <input type={showGenerated ? 'text' : 'password'} value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} required minLength={6} placeholder="Confirmar nova senha"
                className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={resetSaving}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl text-sm transition disabled:cursor-not-allowed">
                  {resetSaving ? 'Redefinindo...' : 'Redefinir'}
                </button>
                <button type="button" onClick={() => { setResetPassUser(null); setResetPass(''); setResetConfirm(''); setResetError(''); }}
                  className="flex-1 py-2 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium text-sm hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
