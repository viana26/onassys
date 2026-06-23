import React from 'react';
import { Database, Shield, AlertCircle } from 'lucide-react';

interface SetupInstructionsProps {
    mensagem?: string;
}

export default function SetupInstructions({ mensagem }: SetupInstructionsProps) {
    return (
        <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center p-6">
            <div className="max-w-lg w-full bg-white dark:bg-[#1a1208] rounded-2xl shadow-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
                        <Database size={28} className="text-amber-700 dark:text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">
                            Configuração Necessária
                        </h1>
                        <p className="text-sm text-[#5c4a37]/70 dark:text-amber-100/50">
                            Configure o banco de dados primeiro
                        </p>
                    </div>
                </div>

                {mensagem && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">{mensagem}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="p-4 bg-[#f8f5ee] dark:bg-[#130b04] rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">1</span>
                            <h3 className="font-semibold text-[#2e2315] dark:text-amber-50">Configure o arquivo .env</h3>
                        </div>
                        <p className="text-sm text-[#5c4a37]/70 dark:text-amber-100/60 ml-8">
                            Copie o <code className="bg-[#ebe2d5] dark:bg-[#1e1005] px-1 rounded">.env.example</code> para <code className="bg-[#ebe2d5] dark:bg-[#1e1005] px-1 rounded">.env</code> e preencha com suas credenciais do Supabase.
                        </p>
                    </div>

                    <div className="p-4 bg-[#f8f5ee] dark:bg-[#130b04] rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">2</span>
                            <h3 className="font-semibold text-[#2e2315] dark:text-amber-50">Execute as Migrations</h3>
                        </div>
                        <p className="text-sm text-[#5c4a37]/70 dark:text-amber-100/60 ml-8">
                            Rode o comando <code className="bg-[#ebe2d5] dark:bg-[#1e1005] px-1 rounded">npm run db:migrate</code> para criar as tabelas no banco de dados.
                        </p>
                    </div>

                    <div className="p-4 bg-[#f8f5ee] dark:bg-[#130b04] rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-amber-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">3</span>
                            <h3 className="font-semibold text-[#2e2315] dark:text-amber-50">Crie o Administrador</h3>
                        </div>
                        <p className="text-sm text-[#5c4a37]/70 dark:text-amber-100/60 ml-8">
                            Após configurar o banco, você será redirecionado para criar a conta de administrador.
                        </p>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                            Dica de Segurança
                        </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        Mantenha seu arquivo <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">.env</code> fora do controle de versão. Ele contém credenciais sensíveis.
                    </p>
                </div>
            </div>
        </div>
    );
}