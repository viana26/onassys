import React, { useState, useEffect } from 'react';
import { Database, ArrowDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { checkDatabaseEmpty, importLocalStorageToSupabase, syncFromSupabase } from '../lib/supabaseClient';

interface DataMigratorProps {
    onComplete: () => void;
}

export default function DataMigrator({ onComplete }: DataMigratorProps) {
    const [status, setStatus] = useState<'checking' | 'syncing' | 'done' | 'error'>('checking');
    const [message, setMessage] = useState('Verificando banco de dados...');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const migrate = async () => {
            try {
                setStatus('checking');
                setMessage('Verificando banco de dados...');
                
                const isEmpty = await checkDatabaseEmpty();
                setProgress(20);

                if (!isEmpty) {
                    setStatus('done');
                    setMessage('Banco já está sincronizado.');
                    setProgress(100);
                    setTimeout(onComplete, 1500);
                    return;
                }

                setProgress(40);
                setStatus('syncing');
                setMessage('Importando dados do localStorage para o Supabase...');

                const result = await importLocalStorageToSupabase();

                if (result.success) {
                    setProgress(80);
                    setMessage('Salvando dados...');
                    
                    setProgress(100);
                    setStatus('done');
                    setMessage(result.message);
                    setTimeout(onComplete, 2000);
                } else {
                    throw new Error(result.message);
                }
            } catch (e) {
                setStatus('error');
                setMessage(`Erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
            }
        };

        migrate();
    }, [onComplete]);

    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8 text-center">
                <div className="mb-6">
                    {status === 'checking' && (
                        <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                            <Database size={32} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                        </div>
                    )}
                    {status === 'syncing' && (
                        <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                            <Loader2 size={32} className="text-amber-600 dark:text-amber-400 animate-spin" />
                        </div>
                    )}
                    {status === 'done' && (
                        <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
                        </div>
                    )}
                </div>

                <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50 mb-2">
                    Sincronização de Dados
                </h2>
                <p className="text-sm text-[#5c4a37]/70 dark:text-amber-100/60 mb-6">
                    {message}
                </p>

                <div className="w-full bg-[#f0eade] dark:bg-[#130b04] rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-amber-600 h-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {status === 'error' && (
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition"
                    >
                        Tentar novamente
                    </button>
                )}
            </div>
        </div>
    );
}