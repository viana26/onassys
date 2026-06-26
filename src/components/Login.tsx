import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, ChefHat, Key, ArrowLeft } from 'lucide-react';
import { signIn, supabase } from '../lib/supabaseClient';

interface LoginProps {
    onLoginSuccess: () => void;
    onNavigateToAddAdmin: () => void;
}

export default function Login({ onLoginSuccess, onNavigateToAddAdmin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRecovery, setShowRecovery] = useState(false);
    const appName = localStorage.getItem('appName') || 'Mini Fábrica';

    const [recEmail, setRecEmail] = useState('');
    const [recCode, setRecCode] = useState('');
    const [recNewPass, setRecNewPass] = useState('');
    const [recConfirm, setRecConfirm] = useState('');
    const [recLoading, setRecLoading] = useState(false);
    const [recError, setRecError] = useState('');
    const [recSuccess, setRecSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn(email, password);

        if (result.success) {
            onLoginSuccess();
        } else {
            setError(result.error || 'Erro ao fazer login');
        }

        setLoading(false);
    };

    const handleRecovery = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecError('');
        if (recNewPass !== recConfirm) { setRecError('As senhas não coincidem'); return; }
        if (recNewPass.length < 6) { setRecError('A senha deve ter pelo menos 6 caracteres'); return; }
        setRecLoading(true);
        const { data, error: rpcError } = await supabase.rpc('redefinir_senha_recovery', {
            p_email: recEmail,
            p_codigo: recCode,
            p_nova_senha: recNewPass,
        });
        if (rpcError) { setRecError(rpcError.message); setRecLoading(false); return; }
        if (data === true) {
            setRecSuccess(true);
            setTimeout(() => { setShowRecovery(false); setRecSuccess(false); }, 4000);
        } else {
            setRecError('Email ou código de recuperação inválido.');
        }
        setRecLoading(false);
    };

    if (showRecovery) {
        return (
            <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8">
                    <button onClick={() => { setShowRecovery(false); setRecError(''); setRecSuccess(false); }}
                        className="flex items-center gap-1.5 text-sm text-[#5c4a37]/70 dark:text-amber-100/60 hover:text-amber-700 dark:hover:text-amber-400 mb-6 transition">
                        <ArrowLeft size={16} /> Voltar ao login
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-600 p-2.5 rounded-xl"><Key size={24} className="text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">Recuperar Senha</h1>
                            <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/50">{appName}</p>
                            <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/50">Use o código de recuperação do administrador</p>
                        </div>
                    </div>

                    {recSuccess && (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
                            Senha redefinida com sucesso!
                        </div>
                    )}

                    {recError && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800 dark:text-red-200">{recError}</p>
                        </div>
                    )}

                    <form onSubmit={handleRecovery} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="email" value={recEmail} onChange={e => setRecEmail(e.target.value)} required
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                                    placeholder="admin@exemplo.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">Código de Recuperação</label>
                            <div className="relative">
                                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="text" value={recCode} onChange={e => setRecCode(e.target.value.toUpperCase())} required
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                                    placeholder="X7K9M2P1" maxLength={8} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">Nova Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="password" value={recNewPass} onChange={e => setRecNewPass(e.target.value)} required minLength={6}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">Confirmar Nova Senha</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                                <input type="password" value={recConfirm} onChange={e => setRecConfirm(e.target.value)} required minLength={6}
                                    className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 focus:outline-none focus:ring-2 focus:ring-amber-500 transition" />
                            </div>
                        </div>
                        <button type="submit" disabled={recLoading}
                            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:cursor-not-allowed">
                            {recLoading ? <span className="animate-pulse">Redefinindo...</span> : <><Key size={18} /> Redefinir Senha</>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-amber-600 p-2.5 rounded-xl">
                        <ChefHat size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">
                            {appName}
                        </h1>
                        <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/50">
                            Acesse sua conta para continuar
                        </p>
                    </div>
                </div>

                <h2 className="text-lg font-semibold text-[#2e2315] dark:text-amber-50 mb-6">
                    Acessar Conta
                </h2>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">
                            Senha
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="off"
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="animate-pulse">Entrando...</span>
                        ) : (
                            <>
                                <LogIn size={18} />
                                <span>Entrar</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 space-y-3">
                    <button onClick={() => setShowRecovery(true)}
                        className="w-full text-center text-sm text-[#5c4a37]/60 dark:text-amber-100/50 hover:text-amber-700 dark:hover:text-amber-400 transition">
                        Esqueci minha senha
                    </button>
                    <div className="border-t border-[#ebdcc9] dark:border-[#2e1a0a] pt-3">
                        <button onClick={onNavigateToAddAdmin}
                            className="w-full text-center text-xs text-[#5c4a37]/40 dark:text-amber-100/30 hover:text-[#5c4a37]/60 dark:hover:text-amber-100/50 transition">
                            Primeiro acesso? Configurar sistema
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}