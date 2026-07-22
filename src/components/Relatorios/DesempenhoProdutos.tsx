import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, TrendingUp, Package } from 'lucide-react';
import { useSortableData } from '../../lib/hooks/useSortableData';
import { SortButton } from '../SortButton';
import { formatarNumero } from '../../lib/calculos';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface DesempenhoProdutosProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

export default function DesempenhoProdutos({ store, isOpen, onClose }: DesempenhoProdutosProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [topN, setTopN] = useState(10);

  const ranking = useMemo(() => {
    const pedidosFiltrados = store.pedidos.filter(p => {
      if (p.status_id !== 5) return false;
      if (dataInicio && new Date(p.data_pedido) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(p.data_pedido) > fim) return false;
      }
      return true;
    });

    const map = new Map<string, { produto: typeof store.produtos[0]; qtdVendida: number; receitaTotal: number; custoTotal: number }>();

    for (const pedido of pedidosFiltrados) {
      const itens = store.itensPedido.filter(i => i.pedido_id === pedido.id);
      for (const item of itens) {
        const produto = store.produtos.find(p => p.id === item.produto_id);
        if (!produto) continue;
        const existente = map.get(produto.id);
        const receita = item.quantidade_solicitada * item.preco_unitario;
        const custo = item.quantidade_solicitada * produto.custo_producao_calculado;
        if (existente) {
          existente.qtdVendida += item.quantidade_solicitada;
          existente.receitaTotal += receita;
          existente.custoTotal += custo;
        } else {
          map.set(produto.id, { produto, qtdVendida: item.quantidade_solicitada, receitaTotal: receita, custoTotal: custo });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.receitaTotal - a.receitaTotal)
      .slice(0, topN)
      .map((item, idx) => ({
        ...item,
        posicao: idx + 1,
        lucroBruto: item.receitaTotal - item.custoTotal,
        margem: item.receitaTotal > 0 ? ((item.receitaTotal - item.custoTotal) / item.receitaTotal) * 100 : 0,
      }));
  }, [store.pedidos, store.itensPedido, store.produtos, dataInicio, dataFim, topN]);

  const { sortedItems, requestSort, sortConfig } = useSortableData(ranking, 'receitaTotal');

  const totalReceita = ranking.reduce((s, r) => s + r.receitaTotal, 0);
  const totalCusto = ranking.reduce((s, r) => s + r.custoTotal, 0);
  const totalQtd = ranking.reduce((s, r) => s + r.qtdVendida, 0);

  const exportCSV = () => {
    const headers = ['Posição', 'Produto', 'Categoria', 'Qtd. Vendida', 'Receita', 'Custo', 'Lucro Bruto', 'Margem %'];
    const rows = ranking.map(r => [
      r.posicao,
      r.produto.nome,
      store.categoriaNome(r.produto.categoria_id),
      r.qtdVendida,
      r.receitaTotal.toFixed(2),
      r.custoTotal.toFixed(2),
      r.lucroBruto.toFixed(2),
      r.margem.toFixed(1),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `desempenho-produtos-${new Date().toISOString().split('T')[0]}.csv`;
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

    const rowsHtml = ranking.map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${r.posicao}`;
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:${bg};font-size:12px">${medalha}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${r.produto.nome}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;color:#57534e;background:${bg}">${store.categoriaNome(r.produto.categoria_id)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:center;font-family:monospace;color:#57534e;background:${bg}">${r.qtdVendida}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#059669;background:${bg}">${formatCurrency(r.receitaTotal)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;background:${bg}">${formatCurrency(r.custoTotal)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:${r.lucroBruto >= 0 ? '#059669' : '#dc2626'};background:${bg}">${formatCurrency(r.lucroBruto)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:${r.margem >= 30 ? '#059669' : r.margem >= 10 ? '#ca8a04' : '#dc2626'};background:${bg}">${formatarNumero(r.margem, 1)}%</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Desempenho de Produtos - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 landscape; }
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Desempenho de Produtos</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:8px;font-weight:700;color:#059669;text-transform:uppercase">Receita Total</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#059669">${formatCurrency(totalReceita)}</p>
    </td>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase">Custo Total</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#dc2626">${formatCurrency(totalCusto)}</p>
    </td>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#f5f3ff">
      <p style="margin:0;font-size:8px;font-weight:700;color:#7c3aed;text-transform:uppercase">Unidades Vendidas</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#7c3aed">${totalQtd}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">#</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Produto</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Categoria</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Qtd.</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Receita</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Custo</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Lucro</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Margem</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Desempenho de Produtos | Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-6xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Desempenho de Produtos</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Produtos mais vendidos, receita e margem de lucro.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Top N</label>
              <select value={topN} onChange={e => setTopN(Number(e.target.value))}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400">
                {[5, 10, 15, 20].map(n => (
                  <option key={n} value={n}>Top {n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Receita Total</span>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatCurrency(totalReceita)}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Custo Total</span>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{formatCurrency(totalCusto)}</p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase">Unidades</span>
              <p className="text-lg font-bold font-mono text-violet-800 dark:text-violet-300">{totalQtd}</p>
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhum produto encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4 text-center w-12">#</th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Produto" sortKey="produto.nome" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Categoria" sortKey="produto.categoria_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Qtd." sortKey="qtdVendida" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Receita" sortKey="receitaTotal" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Custo" sortKey="custoTotal" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Lucro" sortKey="lucroBruto" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap"><SortButton label="Margem" sortKey="margem" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((r) => (
                    <tr key={r.produto.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-3 pl-4 text-center font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {r.posicao === 1 ? '🥇' : r.posicao === 2 ? '🥈' : r.posicao === 3 ? '🥉' : r.posicao}
                      </td>
                      <td className="p-3 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {r.produto.nome}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {store.categoriaNome(r.produto.categoria_id)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {r.qtdVendida}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(r.receitaTotal)}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {formatCurrency(r.custoTotal)}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${r.lucroBruto >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatCurrency(r.lucroBruto)}
                      </td>
                      <td className={`p-3 text-right pr-4 font-mono font-bold whitespace-nowrap ${r.margem >= 30 ? 'text-emerald-700 dark:text-emerald-400' : r.margem >= 10 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatarNumero(r.margem, 1)}%
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
