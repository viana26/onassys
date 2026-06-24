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

  return (
    <div className="relative">
      <button
        onClick={handleRefresh}
        disabled={syncing}
        title={online ? 'Online — clique para recarregar dados' : 'Offline'}
        className={`flex items-center gap-1.5 text-[10px] font-semibold tracking-wider w-full px-2 py-1.5 rounded-lg transition-colors ${
          online
            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
            : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20'
        } ${syncing ? 'animate-pulse' : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {syncing ? (
          <RefreshCw size={12} className="animate-spin" />
        ) : online ? (
          <Wifi size={12} />
        ) : (
          <WifiOff size={12} />
        )}
        <span>{syncing ? 'Recarregando...' : online ? 'Online' : 'Offline'}</span>
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-[#2e2315] dark:bg-[#f8f5ee] text-white dark:text-[#2e2315] text-[10px] p-2 rounded-lg shadow-lg z-50">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={online ? 'text-emerald-400' : 'text-amber-400'}>{online ? 'Online' : 'Offline'}</span>
            </div>
            {store.error && (
              <div className="flex items-center gap-1 text-red-400 mt-1 pt-1 border-t border-white/10 dark:border-black/10">
                <AlertCircle size={10} />
                <span className="truncate">{store.error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
