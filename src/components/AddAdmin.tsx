import React, { useState } from 'react';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { signUp, marcarPrimeiroAcessoConcluido } from '../lib/supabaseClient';

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
            await marcarPrimeiroAcessoConcluido();
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } else {
            setError(result.error || 'Erro ao criar administrador');
        }

        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8 text-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50 mb-2">
                        Administrador Criado!
                    </h2>
                    <p className="text-[#5c4a37]/70 dark:text-amber-100/60">
                        Verifique seu email para confirmar a conta.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8">
                <button
                    onClick={onBack}
                    className="text-sm text-[#5c4a37]/70 dark:text-amber-100/60 hover:text-amber-700 dark:hover:text-amber-400 mb-4 transition"
                >
                    ← Voltar
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-600 p-2.5 rounded-xl">
                        <UserPlus size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">
                            Criar Administrador
                        </h1>
                        <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/50">
                            Primeiro acesso - configuração inicial
                        </p>
                    </div>
                </div>

                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Importante:</strong> Este será o primeiro administrador do sistema. Após criar sua conta, você receberá um email de confirmação.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">
                            Nome Completo
                        </label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="João Silva"
                            />
                        </div>
                    </div>

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
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="admin@exemplo.com"
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
                                minLength={6}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">
                            Confirmar Senha
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4a37]/50 dark:text-amber-100/40" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 placeholder:text-[#5c4a37]/40 dark:placeholder:text-amber-100/30 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                                placeholder="Repita a senha"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="animate-pulse">Criando...</span>
                        ) : (
                            <>
                                <UserPlus size={18} />
                                <span>Criar Administrador</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}