import React from 'react';
import { Banknote, Smartphone, CreditCard, Landmark, Receipt } from 'lucide-react';

export interface FormaPagamentoOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const FORMAS_PAGAMENTO: FormaPagamentoOption[] = [
  { value: 'Dinheiro', label: 'Dinheiro', icon: <Banknote size={16} />, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { value: 'Pix', label: 'Pix', icon: <Smartphone size={16} />, color: 'bg-blue-600 hover:bg-blue-500' },
  { value: 'Débito', label: 'Débito', icon: <CreditCard size={16} />, color: 'bg-indigo-600 hover:bg-indigo-500' },
  { value: 'Crédito', label: 'Crédito', icon: <CreditCard size={16} />, color: 'bg-violet-600 hover:bg-violet-500' },
  { value: 'Transferência', label: 'Transferência', icon: <Landmark size={16} />, color: 'bg-slate-600 hover:bg-slate-500' },
];

export const pagamentoIcons: Record<string, React.ReactNode> = Object.fromEntries(
  FORMAS_PAGAMENTO.map(f => [f.value, f.icon])
) as Record<string, React.ReactNode>;

export const pagamentoLabel: Record<string, string> = Object.fromEntries(
  FORMAS_PAGAMENTO.map(f => [f.value, f.label])
);

export const formasPagamentoSelectOptions = FORMAS_PAGAMENTO.map(f => ({ value: f.value, label: f.label }));
