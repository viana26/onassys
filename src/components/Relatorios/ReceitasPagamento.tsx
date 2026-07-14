import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter } from 'lucide-react';
import { useSortableData } from '../../lib/hooks/useSortableData';
import { SortButton } from '../SortButton';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface ReceitasPagamentoProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

interface PagamentoGroup {
  forma_pagamento: string;
  total: number;
  quantidade: number;
  ticketMedio: number;
  percentual: number;
}

export default function ReceitasPagamento({ store, isOpen, onClose }: ReceitasPagamentoProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const filteredLancamentos = useMemo(() => {
    return store.lancamentos.filter(l => {
      if (l.tipo !== 'receita') return false;
      if (dataInicio && new Date(l.data_lancamento) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(l.data_lancamento) > fim) return false;
      }
      return true;
    });
  }, [store.lancamentos, dataInicio, dataFim]);

  const totalGeral = useMemo(() => filteredLancamentos.reduce((s, l) => s + l.valor, 0), [filteredLancamentos]);

  const gruposPagamento = useMemo(() => {
    const map = new Map<string, { total: number; quantidade: number }>();
    for (const l of filteredLancamentos) {
      const fp = l.forma_pagamento || 'Não informado';
      const atual = map.get(fp) || { total: 0, quantidade: 0 };
      atual.total += l.valor;
      atual.quantidade += 1;
      map.set(fp, atual);
    }
    const result: PagamentoGroup[] = [];
    for (const [forma, dados] of map) {
      result.push({
        forma_pagamento: forma,
        total: dados.total,
        quantidade: dados.quantidade,
        ticketMedio: dados.quantidade > 0 ? dados.total / dados.quantidade : 0,
        percentual: totalGeral > 0 ? (dados.total / totalGeral) * 100 : 0,
      });
    }
    return result.sort((a, b) => b.total - a.total);
  }, [filteredLancamentos, totalGeral]);

  const { sortedItems: sortedGrupos, requestSort, sortConfig } = useSortableData(
    gruposPagamento.map(g => ({ ...g, _key: g.forma_pagamento })),
    'total'
  );

  const exportCSV = () => {
    const headers = ['Forma de Pagamento', 'Quantidade', 'Total Recebido', 'Ticket Médio', '% do Total'];
    const rows = gruposPagamento.map(g => [
      g.forma_pagamento,
      g.quantidade,
      g.total.toFixed(2),
      g.ticketMedio.toFixed(2),
      g.percentual.toFixed(1),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receitas-pagamento-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date().toLocaleString('pt-BR');
    const logoUrl = getLogoUrl(store);
    const cnpjHtml = store.dadosEmpresa?.cnpj ? `<p style="margin:0;font-size:9px;color:#a8a29e">CNPJ: ${store.dadosEmpresa.cnpj}</p>` : '';
    const periodoLabel = `${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : 'Início'} a ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : 'Hoje'}`;

    const rowsHtml = sortedGrupos.map((g, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${g.forma_pagamento}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:center;font-family:monospace;color:#57534e;background:${bg}">${g.quantidade}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#059669;background:${bg}">${formatCurrency(g.total)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;background:${bg}">${formatCurrency(g.ticketMedio)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;background:${bg}">${g.percentual.toFixed(1)}%</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receitas por Pagamento - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 portrait; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1c1917; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
</style></head><body>
  <table style="width:100%;border:none;margin-bottom:1rem"><tr>
    <td style="width:60%;vertical-align:top;border:none">
      <table style="border:none;width:100%"><tr>
        ${logoUrl ? `<td style="width:auto;border:none;padding-right:0.35rem;vertical-align:middle"><img src="${logoUrl}" style="max-width:64px;height:auto;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12)" /></td>` : ''}
        <td style="border:none;vertical-align:middle">
          <h1 style="font-size:20px;font-weight:800;color:#d97706;margin:0">${appName()}</h1>
          ${cnpjHtml}
          <p style="margin:2px 0 0 0;font-size:10px;color:#78716c">${getSlogan(store)}</p>
        </td>
      </tr></table>
    </td>
    <td style="width:40%;text-align:right;vertical-align:top;border:none">
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Receitas por Pagamento</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Registros:</strong> ${filteredLancamentos.length}</td>
    <td style="border:none;text-align:right"><strong>Total Geral:</strong> ${formatCurrency(totalGeral)}</td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Forma de Pagamento</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Qtd.</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Total Recebido</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Ticket Médio</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">% do Total</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr>
      <td colspan="2" style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;font-size:10px">TOTAL GERAL:</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#059669;font-size:10px">${formatCurrency(totalGeral)}</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;font-size:10px">${filteredLancamentos.length > 0 ? formatCurrency(totalGeral / filteredLancamentos.length) : '—'}</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;font-size:10px">100.0%</td>
    </tr></tfoot>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Receitas por Pagamento | Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-5xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Receitas por Pagamento</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Receitas detalhadas por forma de pagamento.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-amber-700 dark:text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Total Recebido</span>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatCurrency(totalGeral)}</p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase">Formas de Pagamento</span>
              <p className="text-lg font-bold font-mono text-violet-800 dark:text-violet-300">{gruposPagamento.length}</p>
            </div>
          </div>

          {sortedGrupos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhuma receita encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Forma de Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-center whitespace-nowrap"><SortButton label="Qtd." sortKey="quantidade" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Total Recebido" sortKey="total" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Ticket Médio" sortKey="ticketMedio" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap"><SortButton label="% do Total" sortKey="percentual" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGrupos.map((g) => (
                    <tr key={g._key} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-3 pl-4 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {g.forma_pagamento}
                      </td>
                      <td className="p-3 text-center font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {g.quantidade}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(g.total)}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {formatCurrency(g.ticketMedio)}
                      </td>
                      <td className="p-3 text-right pr-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {g.percentual.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-amber-100 dark:border-[#2d1e0d] bg-amber-50/30 dark:bg-amber-950/10">
          <button onClick={onClose}
            className="flex-1 sm:flex-none bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-xl text-center text-xs">
            Fechar
          </button>
          <button onClick={exportCSV}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-center text-xs flex items-center justify-center gap-1.5">
            <Download size={14} /> CSV
          </button>
          <button onClick={handlePrint}
            className="flex-1 sm:flex-none bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2 px-4 rounded-xl text-center text-xs flex items-center justify-center gap-1.5">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
