import React, { useState } from 'react';
import { LogIn, Mail, Lock, AlertCircle, ChefHat } from 'lucide-react';
import { signIn, signOut } from '../lib/supabaseClient';

interface LoginProps {
    onLoginSuccess: () => void;
    onNavigateToAddAdmin: () => void;
}

export default function Login({ onLoginSuccess, onNavigateToAddAdmin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-amber-600 p-2.5 rounded-xl">
                        <ChefHat size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">
                            Mini-Factory
                        </h1>
                        <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/50">
                            Salgados & Bolos
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
            </div>
        </div>
    );
}