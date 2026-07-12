import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react';
import { MiniFactoryStore } from '../../lib/store';

const CHECKLIST_KEY = 'onassys_onboarding_checklist';

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

function getInitialItems(store: MiniFactoryStore): ChecklistItem[] {
  return [
    { id: 'produto', label: 'Cadastrar primeiro produto', completed: store.produtos.length > 0 },
    { id: 'material', label: 'Adicionar material ao estoque', completed: store.materiais.length > 0 },
    { id: 'ficha', label: 'Criar ficha técnica', completed: store.fichas.length > 0 },
    { id: 'pedido', label: 'Registrar primeiro pedido', completed: store.pedidos.length > 0 },
    { id: 'relatorio', label: 'Ver relatórios', completed: false },
  ];
}

interface OnboardingChecklistProps {
  store: MiniFactoryStore;
  onNavigate?: (tab: string) => void;
}

export default function OnboardingChecklist({ store, onNavigate }: OnboardingChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => {
    const initial = getInitialItems(store);
    try {
      const saved = JSON.parse(localStorage.getItem(CHECKLIST_KEY) || '[]');
      return initial.map(item => {
        const s = saved.find((s: ChecklistItem) => s.id === item.id);
        return { ...item, completed: item.completed || (s?.completed ?? false) };
      });
    } catch {
      return initial;
    }
  }, [store.produtos.length, store.materiais.length, store.fichas.length, store.pedidos.length]);

  const completedCount = items.filter(i => i.completed).length;
  const allDone = completedCount === items.length;

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const popupHeight = 220;
      setPopupStyle({
        position: 'fixed',
        left: rect.left,
        top: spaceBelow > popupHeight ? rect.bottom + 8 : rect.top - popupHeight - 8,
        width: 240,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  if (allDone) return null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/30 transition whitespace-nowrap"
      >
        <CheckCircle2 size={14} />
        Início ({completedCount}/{items.length})
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div style={popupStyle} className="bg-white dark:bg-[#1c140c] rounded-xl border border-amber-200 dark:border-[#2d1e0d] shadow-xl p-3">
          <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-2">Primeiros Passos</p>
          <div className="space-y-1.5">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.completed && onNavigate) {
                    const tabMap: Record<string, string> = {
                      produto: 'produtos',
                      material: 'materiais',
                      ficha: 'produtos',
                      pedido: 'pedidos',
                      relatorio: 'relatorios',
                    };
                    onNavigate(tabMap[item.id] || 'dashboard');
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-2 text-left text-[11px] py-1 px-1.5 rounded-lg transition ${
                  item.completed
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-amber-100/60 hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer'
                }`}
                disabled={item.completed}
              >
                {item.completed ? <CheckCircle2 size={13} className="shrink-0" /> : <Circle size={13} className="shrink-0" />}
                <span className={`${item.completed ? 'line-through opacity-60' : ''} truncate`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
