import React from 'react';

export function useSmartArrowKeys(
  value: number,
  setter: (v: number) => void,
  min = 0
) {
  return {
    onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      const cursorPos = (e.target as HTMLInputElement).selectionStart ?? 0;
      const str = value.toLocaleString('pt-BR');
      const sep = str.indexOf(',');
      const step = sep >= 0 && cursorPos > sep ? 0.01 : 1;

      const delta = e.key === 'ArrowUp' ? step : -step;
      const next = Math.round((value + delta) * 100) / 100;
      setter(Math.max(min, next));
    }
  };
}
