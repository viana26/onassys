import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { MiniFactoryStore } from '../lib/store';

interface SyncStatusProps {
  store: MiniFactoryStore;
}

export default function SyncStatus({ store }: SyncStatusProps) {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const onln = () => setOnline(true);
    const offln = () => setOnline(false);
    window.addEventListener('online', onln);
    window.addEventListener('offline', offln);
    return () => {
      window.removeEventListener('online', onln);
      window.removeEventListener('offline', offln);
    };
  }, []);

  const handleRefresh = async () => {
    setSyncing(true);
    await store.refresh();
    setSyncing(false);
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };

  const isOffline = !online || !!store.error;

  return (
    <div className="relative">
      <button
        onClick={handleRefresh}
        disabled={syncing}
        title={isOffline ? 'Offline — clique para tentar reconectar' : 'Online — clique para recarregar dados'}
        className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wider w-full px-2 py-1.5 rounded-lg transition-colors ${
          syncing
            ? 'animate-pulse bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : isOffline
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
        }`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {syncing ? (
          <RefreshCw size={14} className="animate-spin shrink-0" />
        ) : isOffline ? (
          <WifiOff size={14} className="shrink-0" />
        ) : (
          <Wifi size={14} className="shrink-0" />
        )}
        <span className="truncate">
          {syncing ? 'RECARREGANDO...' : isOffline ? '🔴 OFFLINE' : '🟢 ONLINE'}
        </span>
        {isOffline && <span className="ml-auto text-[8px] opacity-70">⚠</span>}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#2e2315] dark:bg-[#f8f5ee] text-white dark:text-[#2e2315] text-[10px] p-2.5 rounded-lg shadow-lg z-50">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Status:</span>
              <span className={`font-bold ${isOffline ? 'text-red-400 dark:text-red-600' : 'text-emerald-400 dark:text-emerald-600'}`}>
                {isOffline ? 'Offline' : 'Online'}
              </span>
            </div>
            {store.errorType === 'server' && (
              <div className="flex items-start gap-1.5 text-red-400 dark:text-red-600 mt-1 pt-1.5 border-t border-white/10 dark:border-black/10">
                <AlertCircle size={10} className="shrink-0 mt-0.5" />
                <span className="leading-tight">Erro no servidor — contate o supervisor.</span>
              </div>
            )}
            {(!online || store.errorType === 'network') && (
              <div className="flex items-start gap-1.5 text-red-400 dark:text-red-600 mt-1 pt-1.5 border-t border-white/10 dark:border-black/10">
                <AlertCircle size={10} className="shrink-0 mt-0.5" />
                <span className="leading-tight">Sem conexão com o servidor.</span>
              </div>
            )}
            <div className="text-[8px] opacity-60 mt-1">
              Clique para recarregar dados
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
