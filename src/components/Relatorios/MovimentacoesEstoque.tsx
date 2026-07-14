import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useSortableData } from '../../lib/hooks/useSortableData';
import { SortButton } from '../SortButton';
import SelectSearch from '../SelectSearch';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface MovimentacoesEstoqueProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

export default function MovimentacoesEstoque({ store, isOpen, onClose }: MovimentacoesEstoqueProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<number>(0);
  const [filtroProduto, setFiltroProduto] = useState<string>('todos');

  const filteredMovimentacoes = useMemo(() => {
    return store.movProdutos.filter(m => {
      if (dataInicio && new Date(m.criado_em) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(m.criado_em) > fim) return false;
      }
      if (filtroTipo && m.tipo_id !== filtroTipo) return false;
      if (filtroProduto !== 'todos' && m.produto_id !== filtroProduto) return false;
      return true;
    }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [store.movProdutos, dataInicio, dataFim, filtroTipo, filtroProduto]);

  const { sortedItems: sortedMov, requestSort, sortConfig } = useSortableData(
    filteredMovimentacoes.map(m => ({ ...m, _key: m.id })),
    'criado_em'
  );

  const totalEntradas = useMemo(() => {
    return filteredMovimentacoes
      .filter(m => store.tiposMovimentacao.find(t => t.id === m.tipo_id)?.natureza === 'entrada')
      .reduce((s, m) => s + m.quantidade, 0);
  }, [filteredMovimentacoes, store.tiposMovimentacao]);

  const totalSaidas = useMemo(() => {
    return filteredMovimentacoes
      .filter(m => store.tiposMovimentacao.find(t => t.id === m.tipo_id)?.natureza === 'saida')
      .reduce((s, m) => s + m.quantidade, 0);
  }, [filteredMovimentacoes, store.tiposMovimentacao]);

  const exportCSV = () => {
    const headers = ['Data', 'Produto', 'Tipo', 'Quantidade', 'Observação'];
    const rows = filteredMovimentacoes.map(m => [
      new Date(m.criado_em).toLocaleDateString('pt-BR'),
      store.produtos.find(p => p.id === m.produto_id)?.nome || m.produto_id,
      store.tipoMovNome(m.tipo_id),
      m.quantidade,
      m.observacao || '',
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimentacoes-estoque-${new Date().toISOString().split('T')[0]}.csv`;
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

    const rowsHtml = sortedMov.map((m, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      const natureza = store.tiposMovimentacao.find(t => t.id === m.tipo_id)?.natureza;
      const tipoColor = natureza === 'entrada' ? '#059669' : '#dc2626';
      const icon = natureza === 'entrada' ? '↑' : '↓';
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-family:monospace;color:#57534e;background:${bg}">${new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${store.produtos.find(p => p.id === m.produto_id)?.nome || m.produto_id}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;background:${bg}"><span style="color:${tipoColor};font-weight:600;font-size:9px;text-transform:uppercase">${icon} ${store.tipoMovNome(m.tipo_id)}</span></td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#1c1917;background:${bg}">${m.quantidade}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;color:#57534e;background:${bg}">${m.observacao || '—'}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Movimentações de Estoque - ${appName()}</title>
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Movimentações de Estoque</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Registros:</strong> ${filteredMovimentacoes.length}</td>
  </tr></table>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:50%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:8px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px">Total Entradas</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#059669">${totalEntradas}</p>
    </td>
    <td style="width:50%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px">Total Saídas</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#dc2626">${totalSaidas}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Data</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Produto</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Tipo</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Quantidade</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Observação</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Movimentações de Estoque | Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-6xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Movimentações de Estoque</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Histórico de entradas e saídas de produtos.</p>
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40 block mb-1">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40 block mb-1">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40 block mb-1">Tipo</label>
              <select value={filtroTipo} onChange={e => setFiltroTipo(Number(e.target.value))}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400">
                <option value={0}>Todos</option>
                {store.tiposMovimentacao.filter(t => t.entidade === 'produto' || t.entidade === 'ambos').map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex-[2] min-w-[140px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40 block mb-1">Produto</label>
              <SelectSearch value={filtroProduto} onChange={v => setFiltroProduto(v)} options={[{ value: 'todos', label: 'Todos' }, ...store.produtos.map(p => ({ value: p.id, label: p.nome }))]} placeholder="Filtrar por produto" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Total Entradas</span>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{totalEntradas}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Total Saídas</span>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{totalSaidas}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Registros</span>
              <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">{filteredMovimentacoes.length}</p>
            </div>
          </div>

          {sortedMov.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhuma movimentação encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Data" sortKey="criado_em" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Produto" sortKey="produto_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Tipo" sortKey="tipo_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Quantidade" sortKey="quantidade" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap"><SortButton label="Observação" sortKey="observacao" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMov.map((m) => {
                    const natureza = store.tiposMovimentacao.find(t => t.id === m.tipo_id)?.natureza;
                    return (
                      <tr key={m._key} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                        <td className="p-3 pl-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                          {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                          {store.produtos.find(p => p.id === m.produto_id)?.nome || m.produto_id}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            natureza === 'entrada'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {natureza === 'entrada' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {store.tipoMovNome(m.tipo_id)}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${natureza === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {natureza === 'entrada' ? '+' : '-'}{m.quantidade}
                        </td>
                        <td className="p-3 text-right pr-4 text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                          {m.observacao || '—'}
                        </td>
                      </tr>
                    );
                  })}
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
