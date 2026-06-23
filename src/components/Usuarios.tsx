import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Trash2, Shield, ChevronDown, AlertCircle } from 'lucide-react';
import { supabaseAdmin, supabase } from '../lib/supabaseClient';

interface Usuario {
    id: string;
    email: string;
    nome: string;
    nivel: string;
    ativo: boolean;
    criado_em: string;
}

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');
    const [nivel, setNivel] = useState('admin');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const carregarUsuarios = async () => {
        setLoading(true);
        try {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            
            const usuariosComPerfis = await Promise.all(
                (users || []).map(async (user) => {
                    const { data: perfil } = await supabase
                        .from('perfis')
                        .select('nome, nivel, ativo')
                        .eq('id', user.id)
                        .single();
                    
                    return {
                        id: user.id,
                        email: user.email || '',
                        nome: perfil?.nome || user.email || 'Sem nome',
                        nivel: perfil?.nivel || 'admin',
                        ativo: perfil?.ativo ?? true,
                        criado_em: user.created_at
                    };
                })
            );

            setUsuarios(usuariosComPerfis);
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
                email,
                password: senha,
                email_confirm: true,
                user_metadata: { nome }
            });

            if (signUpError) {
                setError(signUpError.message);
                setSaving(false);
                return;
            }

            if (data.user) {
                await supabase.from('perfis').upsert({
                    id: data.user.id,
                    nome,
                    nivel,
                    ativo: true
                });
            }

            setShowModal(false);
            setEmail('');
            setSenha('');
            setNome('');
            setNivel('admin');
            carregarUsuarios();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao criar usuário');
        }
        setSaving(false);
    };

    const toggleAtivo = async (userId: string, ativo: boolean) => {
        await supabase.from('perfis').update({ ativo: !ativo }).eq('id', userId);
        carregarUsuarios();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">
                        Usuários do Sistema
                    </h2>
                    <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">
                        Gerencie usuários e níveis de acesso
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition"
                >
                    <Plus size={18} />
                    <span>Novo Usuário</span>
                </button>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-[#f0eade] dark:bg-[#130b04] rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-[#f8f5ee] dark:bg-[#130b04]">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Usuário</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Nível</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ebdcc9] dark:divide-[#2e1a0a]">
                            {usuarios.map((user) => (
                                <tr key={user.id} className="hover:bg-[#f8f5ee]/50 dark:hover:bg-[#130b04]/50 transition">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-[#2e2315] dark:text-amber-50">{user.nome}</p>
                                            <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50">{user.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                            user.nivel === 'admin' 
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                        }`}>
                                            <Shield size={12} />
                                            {user.nivel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleAtivo(user.id, user.ativo)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition ${
                                                user.ativo
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}
                                        >
                                            {user.ativo ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <select
                                            value={user.nivel}
                                            onChange={async (e) => {
                                                await supabase.from('perfis').update({ nivel: e.target.value }).eq('id', user.id);
                                                carregarUsuarios();
                                            }}
                                            className="text-xs border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-lg px-2 py-1 bg-[#f8f5ee] dark:bg-[#130b04] text-[#2e2315] dark:text-amber-50"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="operador">Operador</option>
                                            <option value="visualizacao">Visualização</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {usuarios.length === 0 && (
                        <div className="p-8 text-center text-[#5c4a37]/60 dark:text-amber-100/50">
                            Nenhum usuário encontrado
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
                        <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50 mb-4">
                            Criar Novo Usuário
                        </h3>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <form onSubmit={criarUsuario} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Senha</label>
                                <input
                                    type="password"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Nível de Acesso</label>
                                <select
                                    value={nivel}
                                    onChange={(e) => setNivel(e.target.value)}
                                    className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="admin">Administrador</option>
                                    <option value="operador">Operador</option>
                                    <option value="visualizacao">Visualização</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setError('');
                                    }}
                                    className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl transition disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Criando...' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}