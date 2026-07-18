import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import SelectSearch from '../SelectSearch';
import { useSortableData } from '../../lib/hooks/useSortableData';
import { SortButton } from '../SortButton';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

const pagamentoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'Pix', cartao_credito: 'Crédito',
  cartao_debito: 'Débito', boleto: 'Boleto', transferencia: 'Transferência',
};

interface MovimentacoesFinanceirasProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

export default function MovimentacoesFinanceiras({ store, isOpen, onClose }: MovimentacoesFinanceirasProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [filtroCategoria, setFiltroCategoria] = useState('0');
  const [filtroPagamento, setFiltroPagamento] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const categoriasFinanceiro = useMemo(() => store.categoriasFinanceiro.filter(c => c.tipo === 'receita' || c.tipo === 'despesa'), [store.categoriasFinanceiro]);

  const filteredLancamentos = useMemo(() => {
    return store.lancamentos.filter(l => {
      if (filtroTipo !== 'todas' && l.tipo !== filtroTipo) return false;
      if (filtroCategoria !== '0' && l.categoria_id !== Number(filtroCategoria)) return false;
      if (filtroPagamento !== 'todos' && l.forma_pagamento !== filtroPagamento) return false;
      if (dataInicio && new Date(l.data_lancamento) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(l.data_lancamento) > fim) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const catNome = store.categoriaFinanceiroNome(l.categoria_id).toLowerCase();
        if (!l.descricao?.toLowerCase().includes(term) && !l.forma_pagamento?.toLowerCase().includes(term) && !catNome.includes(term) && !l.valor.toString().includes(term.replace(',', '.').replace('r$', '').trim())) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime());
  }, [store.lancamentos, store, dataInicio, dataFim, filtroTipo, filtroCategoria, filtroPagamento, searchTerm]);

  const { sortedItems: sortedLancamentos, requestSort, sortConfig } = useSortableData(
    filteredLancamentos as (typeof filteredLancamentos[number] & Record<string, unknown>)[],
    'data_lancamento', 'desc'
  );

  const totalReceitas = filteredLancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const totalDespesas = filteredLancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldoTotal = totalReceitas - totalDespesas;

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Pagamento', 'Valor'];
    const rows = sortedLancamentos.map(l => [
      l.data_lancamento.substring(0, 10),
      l.tipo === 'receita' ? 'Receita' : 'Despesa',
      store.categoriaFinanceiroNome(l.categoria_id),
      l.descricao || '',
      pagamentoLabel[l.forma_pagamento || ''] || l.forma_pagamento || '',
      (l.tipo === 'receita' ? '' : '-') + l.valor.toFixed(2),
    ]);
    rows.push(['', '', '', '', 'TOTAL RECEITAS', totalReceitas.toFixed(2)]);
    rows.push(['', '', '', '', 'TOTAL DESPESAS', totalDespesas.toFixed(2)]);
    rows.push(['', '', '', '', 'SALDO', saldoTotal.toFixed(2)]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes-financeiras-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const now = new Date().toLocaleString('pt-BR');
      const logoUrl = getLogoUrl(store);
      const cnpjHtml = store.dadosEmpresa?.cnpj ? `<p style="margin:0;font-size:9px;color:#a8a29e">CNPJ: ${store.dadosEmpresa.cnpj}</p>` : '';
      const periodoLabel = `${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : 'Início'} a ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : 'Hoje'}`;

    const rowsHtml = sortedLancamentos.map((l, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      const valorDisplay = (l.tipo === 'receita' ? '' : '-') + formatCurrency(l.valor);
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;font-family:monospace;color:#57534e;background:${bg}">${new Date(l.data_lancamento).toLocaleDateString('pt-BR')}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;background:${bg};color:${l.tipo === 'receita' ? '#059669' : '#dc2626'}">${l.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;background:${bg}">${store.categoriaFinanceiroNome(l.categoria_id)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;background:${bg}">${l.descricao || '—'}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;background:${bg}">${pagamentoLabel[l.forma_pagamento || ''] || '—'}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:${l.tipo === 'receita' ? '#059669' : '#dc2626'};background:${bg}">${valorDisplay}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Movimentações Financeiras - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 landscape; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1c1917; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Movimentações Financeiras</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Tipo:</strong> ${filtroTipo === 'todas' ? 'Todas' : filtroTipo}</td>
    <td style="border:none"><strong>Registros:</strong> ${sortedLancamentos.length}</td>
  </tr></table>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:33.33%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:7px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px">Receitas</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:#059669">${formatCurrency(totalReceitas)}</p>
    </td>
    <td style="width:33.33%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:7px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px">Despesas</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:#dc2626">${formatCurrency(totalDespesas)}</p>
    </td>
    <td style="width:33.33%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:${saldoTotal >= 0 ? '#ecfdf5' : '#fef2f2'}">
      <p style="margin:0;font-size:7px;font-weight:700;color:${saldoTotal >= 0 ? '#059669' : '#dc2626'};text-transform:uppercase;letter-spacing:1px">Saldo</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:${saldoTotal >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(saldoTotal)}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Data</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Tipo</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Categoria</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Descrição</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Pagamento</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Valor</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr>
      <td colspan="4" style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:800;color:#1c1917;font-size:10px">RECEITAS:</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#059669">${formatCurrency(totalReceitas)}</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#059669"></td>
    </tr><tr>
      <td colspan="4" style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:800;color:#1c1917;font-size:10px">DESPESAS:</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#dc2626">${formatCurrency(totalDespesas)}</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#dc2626"></td>
    </tr><tr>
      <td colspan="4" style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:800;color:#1c1917;font-size:10px">SALDO:</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:800;color:${saldoTotal >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(saldoTotal)}</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:800;color:${saldoTotal >= 0 ? '#059669' : '#dc2626'}"></td>
    </tr></tfoot>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Movimentações Financeiras | Período: ${periodoLabel}</p>
    </div>
</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
    onClose();
  };

  if (!isOpen) return null;

  const pagamentoOptions = [{ value: 'todos', label: 'Todos' }, ...Object.entries(pagamentoLabel).map(([v, l]) => ({ value: v, label: l }))];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-6xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Movimentações Financeiras</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Todas as receitas e despesas com filtros por período, tipo, categoria e pagamento.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer" aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-amber-50/20 dark:bg-amber-950/10 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-amber-700 dark:text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Tipo</label>
              <SelectSearch value={filtroTipo} onChange={v => setFiltroTipo(v)} options={[{ value: 'todas', label: 'Todas' }, { value: 'receita', label: 'Receitas' }, { value: 'despesa', label: 'Despesas' }]} placeholder="Todas" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Categoria</label>
              <SelectSearch value={filtroCategoria} onChange={v => setFiltroCategoria(v)} options={[{ value: '0', label: 'Todas' }, ...categoriasFinanceiro.map(c => ({ value: String(c.id), label: c.nome }))]} placeholder="Todas" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Pagamento</label>
              <SelectSearch value={filtroPagamento} onChange={v => setFiltroPagamento(v)} options={pagamentoOptions} placeholder="Todos" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Busca</label>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Descrição..."
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase flex items-center gap-1"><TrendingUp size={12} /> Receitas</span>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatCurrency(totalReceitas)}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase flex items-center gap-1"><TrendingDown size={12} /> Despesas</span>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${saldoTotal >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
              <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${saldoTotal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}><DollarSign size={12} /> Saldo</span>
              <p className={`text-lg font-bold font-mono ${saldoTotal >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{formatCurrency(saldoTotal)}</p>
            </div>
          </div>

          {/* Table */}
          {sortedLancamentos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhum lançamento encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4"><SortButton label="Data" sortKey="data_lancamento" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3"><SortButton label="Tipo" sortKey="tipo" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3"><SortButton label="Categoria" sortKey="categoria_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3"><SortButton label="Descrição" sortKey="descricao" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3"><SortButton label="Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 pr-4 text-right"><SortButton label="Valor" sortKey="valor" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLancamentos.map(l => (
                    <tr key={l.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-3 pl-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {new Date(l.data_lancamento).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.tipo === 'receita' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                          {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700 dark:text-amber-200/70">{store.categoriaFinanceiroNome(l.categoria_id)}</td>
                      <td className="p-3 text-gray-700 dark:text-amber-200/70 font-medium">{l.descricao || '—'}</td>
                      <td className="p-3 text-gray-500 dark:text-amber-100/40">{pagamentoLabel[l.forma_pagamento || ''] || '—'}</td>
                      <td className={`p-3 pr-4 text-right font-mono font-bold whitespace-nowrap ${l.tipo === 'receita' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {l.tipo === 'receita' ? '+' : '-'}{formatCurrency(l.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
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
