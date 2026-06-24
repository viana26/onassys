import React, { useState } from 'react';
import { Save } from 'lucide-react';

interface ConfiguracaoProps {
  appName: string;
  onSaveAppName: (name: string) => void;
}

export default function Configuracao({ appName, onSaveAppName }: ConfiguracaoProps) {
  const [nome, setNome] = useState(appName);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSaveAppName(nome || 'Mini Fábrica');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">Configurações</h2>
        <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Personalize o sistema</p>
      </div>

      <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-6 max-w-lg">
        <h3 className="text-sm font-semibold text-[#2e2315] dark:text-amber-50 mb-1">Nome da Aplicação</h3>
        <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50 mb-4">Nome exibido no menu lateral e cabeçalho</p>

        <input type="text" value={nome} onChange={e => setNome(e.target.value)}
          className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4" />

        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl transition">
          <Save size={16} /> {saved ? 'Salvo!' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
