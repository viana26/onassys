import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { SortConfig, SortDirection } from '../lib/hooks/useSortableData';

interface SortButtonProps<T> {
  label: string;
  sortKey: keyof T;
  sortConfig: SortConfig<T> | null;
  onSort: (key: keyof T) => void;
  align?: 'left' | 'center' | 'right';
}

export function SortButton<T extends Record<string, unknown>>({
  label,
  sortKey,
  sortConfig,
  onSort,
  align = 'left',
}: SortButtonProps<T>) {
  const isActive = sortConfig?.key === sortKey;
  const direction: SortDirection | null = isActive ? sortConfig.direction : null;

  const alignClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 cursor-pointer hover:text-amber-700 dark:hover:text-amber-300 transition font-semibold select-none ${alignClass}`}
    >
      <span>{label}</span>
      {direction === 'asc' ? (
        <ChevronUp size={12} className="text-amber-600 dark:text-amber-400" />
      ) : direction === 'desc' ? (
        <ChevronDown size={12} className="text-amber-600 dark:text-amber-400" />
      ) : (
        <ChevronsUpDown size={10} className="opacity-30" />
      )}
    </button>
  );
}
