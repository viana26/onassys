import React, { useState, useEffect } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle, Copy, Key } from 'lucide-react';
import { signUp, marcarPrimeiroAcessoConcluido, supabase } from '../lib/supabaseClient';

interface AddAdminProps {
    onSuccess: () => void;
    onBack: () => void;
}

export default function AddAdmin({ onSuccess, onBack }: AddAdminProps) {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);

        const result = await signUp(email, password, nome);

        if (result.success) {
            if (result.userId) {
                await supabase.from('perfis_usuario').upsert({
                    id: result.userId,
                    nome,
                    perfil_id: 1,
                    ativo: true,
                });
            }
            await marcarPrimeiroAcessoConcluido();
            let code = '';
            if (result.userId) {
                const { data: c } = await supabase.rpc('gerar_codigo_recovery_usuario', { p_user_id: result.userId });
                code = c || '';
            }
            await supabase.rpc('gerar_codigo_recovery');
            setRecoveryCode(code);
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 10000);
        } else {
            setError(result.error || 'Erro ao criar administrador');
        }

        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-4">
                <div className="max-w-sm w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-5 text-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-[#2e2315] dark:text-amber-50 mb-1">
                        Administrador Criado!
                    </h2>
                    <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/60 mb-3">
                        Guarde o código abaixo para recuperar sua senha.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-3">
                        <div className="flex items-center gap-1.5 justify-center mb-2">
                            <Key size={14} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 tracking-wider">
                                CÓDIGO DE RECUPERAÇÃO
                            </span>
                        </div>
                        <div className="bg-white dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-lg px-3 py-2 mb-2">
                            <span className="text-xl font-bold tracking-[0.3em] text-[#2e2315] dark:text-amber-50 select-all font-mono">
                                {recoveryCode}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                              try { navigator.clipboard.writeText(recoveryCode); } catch {
                                const ta = document.createElement('textarea');
                                ta.value = recoveryCode; ta.style.position = 'fixed'; ta.style.opacity = '0';
                                document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
                              }
                              setCopied(true); setTimeout(() => setCopied(false), 2000);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-600 dark:hover:text-amber-200 transition"
                        >
                            <Copy size={12} />
                            {copied ? 'Copiado!' : 'Copiar código'}
                        </button>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-[10px] text-red-700 dark:text-red-300">
                            ⚠️ Código exibido apenas uma vez. Guarde em local seguro.
                        </p>
                    </div>
                    <p className="text-[10px] text-[#5c4a37]/50 dark:text-amber-100/40 mt-3">
                        Redirecionando para login...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-5">
                <button
                    onClick={onBack}
                    className="text-xs text-[#5c4a37]/70 dark:text-amber-100/60 hover:text-amber-700 dark:hover:text-amber-400 mb-3 transition"
                >
                    ← Voltar
                </button>

                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-amber-600 p-2 rounded-xl">
                        <UserPlus size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-[#2e2315] dark:text-amber-50">
                            Criar Administrador
                        </h1>
                        <p className="text-[10px] text-[#5c4a37]/70 dark:text-amber-100/50">
                            Primeiro acesso — configuração inicial
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 dark:text-red-200 min-w-0">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="João Silva" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Email</label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="admin@exemplo.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Senha</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                    placeholder="Mín. 6" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Confirmar</label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                    placeholder="Repetir" />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 text-sm transition disabled:cursor-not-allowed">
                        {loading ? (
                            <span className="animate-pulse">Criando...</span>
                        ) : (
                            <><UserPlus size={16} /> <span>Criar Administrador</span></>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}