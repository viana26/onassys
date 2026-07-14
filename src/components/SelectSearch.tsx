import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectSearchProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  displayFn?: (label: string) => string;
}

export default function SelectSearch({ value, onChange, options, placeholder, className, displayFn }: SelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [open]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === value);
  const displayText = selected ? (displayFn ? displayFn(selected.label) : selected.label) : null;

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full h-9 px-3 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-sm bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 text-left flex items-center justify-between gap-2 focus:outline-none focus:border-amber-400 cursor-pointer"
      >
        <span className="text-left">{displayText || placeholder || 'Selecione...'}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div
          className="fixed z-[9999] bg-white dark:bg-[#1c140c] border border-amber-200 dark:border-[#2d1e0d] rounded-lg shadow-lg overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          <div className="p-1.5 border-b border-amber-100 dark:border-[#2d1e0d]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2 py-1 rounded text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">Nenhum resultado</li>
            ) : (
              filtered.map(o => (
                <li
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); }}
                  className={`px-3 py-2 text-xs cursor-pointer transition hover:bg-amber-50 dark:hover:bg-amber-950/20 ${o.value === value ? 'bg-amber-100 dark:bg-amber-950/40 font-semibold text-amber-950 dark:text-amber-100' : 'text-gray-700 dark:text-amber-200/70'}`}
                >
                  {displayFn ? displayFn(o.label) : o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
