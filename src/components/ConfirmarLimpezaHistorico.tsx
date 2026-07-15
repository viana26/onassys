import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmarLimpezaHistoricoProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  totalRegistros: number;
  tipoLabel: string;
}

export default function ConfirmarLimpezaHistorico({ open, onClose, onConfirm, totalRegistros, tipoLabel }: ConfirmarLimpezaHistoricoProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    setConfirmed(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-[#120c06] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2d1e0d] shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-base font-bold text-amber-950 dark:text-amber-100">Limpar Histórico</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-amber-100/70">
          Você está prestes a excluir <strong className="text-red-600 dark:text-red-400">{totalRegistros} registro(s)</strong> do histórico de movimentações de {tipoLabel}.
        </p>

        <div className="bg-red-50/50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 rounded-xl p-3">
          <p className="text-xs text-red-700 dark:text-red-300 font-medium flex items-start gap-2">
            <Trash2 size={14} className="mt-0.5 shrink-0" />
            Esta ação é <strong>irreversível</strong>. Os registros serão removidos permanentemente do banco de dados.
          </p>
        </div>

        <label className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/30 dark:bg-amber-950/10 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="rounded border-amber-300 dark:border-amber-950/40 text-amber-600 focus:ring-amber-500"
          />
          <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Entendo que esta ação é irreversível
          </span>
        </label>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-amber-200 dark:border-[#2d1e0d] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-amber-50 dark:hover:bg-amber-950/20 transition text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || loading}
            className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 disabled:bg-red-400 dark:disabled:bg-red-800 text-white font-semibold rounded-xl transition text-xs disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Trash2 size={14} />
            )}
            {loading ? 'Excluindo...' : 'Excluir Selecionados'}
          </button>
        </div>
      </div>
    </div>
  );
}
