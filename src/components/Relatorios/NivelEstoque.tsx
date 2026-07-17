import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useSortableData } from '../../lib/hooks/useSortableData';
import { SortButton } from '../SortButton';
import SelectSearch from '../SelectSearch';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface NivelEstoqueProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

type StatusEstoque = 'disponivel' | 'baixo' | 'critico' | 'esgotado';

function getStatus(qtd: number, minima: number): { label: string; status: StatusEstoque; color: string } {
  if (qtd <= 0) {
    return { label: 'Esgotado', status: 'esgotado', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
  }
  if (minima > 0 && qtd <= minima * 0.5) {
    return { label: 'Crítico', status: 'critico', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800' };
  }
  if (minima > 0 && qtd <= minima) {
    return { label: 'Baixo', status: 'baixo', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' };
  }
  return { label: 'Disponível', status: 'disponivel', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' };
}

export default function NivelEstoque({ store, isOpen, onClose }: NivelEstoqueProps) {
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusEstoque>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<number | 'todos'>('todos');
  const [busca, setBusca] = useState('');

  const itensEstoque = useMemo(() => {
    return store.produtos.filter(p => p.ativo).map(p => {
      const estoques = store.estoqueProdutos.filter(e => e.produto_id === p.id);
      const qtdTotal = estoques.reduce((s, e) => s + e.quantidade_disponivel, 0);
      const minima = estoques.length > 0 ? estoques[0].quantidade_minima : 0;
      const status = getStatus(qtdTotal, minima);
      return {
        produto: p,
        qtdTotal,
        minima,
        status,
        custoTotal: qtdTotal * p.custo_producao_calculado,
      };
    });
  }, [store.produtos, store.estoqueProdutos]);

  const itensFiltrados = useMemo(() => {
    return itensEstoque.filter(item => {
      if (filtroStatus !== 'todos' && item.status.status !== filtroStatus) return false;
      if (filtroCategoria !== 'todos' && item.produto.categoria_id !== filtroCategoria) return false;
      if (busca && !item.produto.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [itensEstoque, filtroStatus, filtroCategoria, busca]);

  const { sortedItems, requestSort, sortConfig } = useSortableData(itensFiltrados, 'qtdTotal');

  const stats = useMemo(() => ({
    total: itensEstoque.length,
    disponiveis: itensEstoque.filter(i => i.status.status === 'disponivel').length,
    baixos: itensEstoque.filter(i => i.status.status === 'baixo').length,
    criticos: itensEstoque.filter(i => i.status.status === 'critico' || i.status.status === 'esgotado').length,
    valorTotal: itensEstoque.reduce((s, i) => s + i.custoTotal, 0),
  }), [itensEstoque]);

  const exportCSV = () => {
    const headers = ['Produto', 'Categoria', 'Qtd. Disponível', 'Qtd. Mínima', 'Status', 'Custo Total'];
    const rows = itensFiltrados.map(i => [
      i.produto.nome,
      store.categoriaNome(i.produto.categoria_id),
      i.qtdTotal,
      i.minima,
      i.status.label,
      i.custoTotal.toFixed(2),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nivel-estoque-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const now = new Date().toLocaleString('pt-BR');
    const logoUrl = getLogoUrl(store);
    const cnpjHtml = store.dadosEmpresa?.cnpj ? `<p style="margin:0;font-size:9px;color:#a8a29e">CNPJ: ${store.dadosEmpresa.cnpj}</p>` : '';

    const rowsHtml = itensFiltrados.map((i, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      const statusColor = i.status.status === 'disponivel' ? '#059669' : '#dc2626';
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${i.produto.nome}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;color:#57534e;background:${bg}">${store.categoriaNome(i.produto.categoria_id)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#1c1917;background:${bg}">${i.qtdTotal}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#57534e;background:${bg}">${i.minima}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;background:${bg}"><span style="color:${statusColor};font-weight:600;font-size:9px;text-transform:uppercase">${i.status.label}</span></td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#1c1917;background:${bg}">${formatCurrency(i.custoTotal)}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nível de Estoque - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 landscape; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1c1917; font-size: 11px; }
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Nível de Estoque</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:20%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:8px;font-weight:700;color:#059669;text-transform:uppercase">Disponíveis</p>
      <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#059669">${stats.disponiveis}</p>
    </td>
    <td style="width:20%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase">Críticos/Esgotados</p>
      <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#dc2626">${stats.criticos}</p>
    </td>
    <td style="width:20%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fefce8">
      <p style="margin:0;font-size:8px;font-weight:700;color:#ca8a04;text-transform:uppercase">Baixos</p>
      <p style="margin:4px 0 0 0;font-size:18px;font-weight:700;color:#ca8a04">${stats.baixos}</p>
    </td>
    <td style="width:20%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#f9fafb">
    </td>
    <td style="width:20%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#f5f3ff">
      <p style="margin:0;font-size:8px;font-weight:700;color:#7c3aed;text-transform:uppercase">Valor Total</p>
      <p style="margin:4px 0 0 0;font-size:14px;font-weight:700;color:#7c3aed">${formatCurrency(stats.valorTotal)}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Produto</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Categoria</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Qtd.</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Mínima</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Status</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Custo</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr>
      <td colspan="8" style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;font-size:10px">VALOR TOTAL:</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#7c3aed;font-size:10px">${formatCurrency(stats.valorTotal)}</td>
    </tr></tfoot>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Nível de Estoque | ${stats.total} produtos</p>
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
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Nível de Estoque</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Posição atual do estoque com status e validades.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Buscar Produto</label>
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome do produto..."
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Status</label>
              <SelectSearch value={filtroStatus} onChange={v => setFiltroStatus(v as 'todos' | 'disponivel' | 'baixo' | 'critico' | 'esgotado')} options={[{ value: 'todos', label: 'Todos' }, { value: 'disponivel', label: 'Disponível' }, { value: 'baixo', label: 'Baixo' }, { value: 'critico', label: 'Crítico' }, { value: 'esgotado', label: 'Esgotado' }]} placeholder="Filtrar por status" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Categoria</label>
              <SelectSearch value={filtroCategoria} onChange={v => setFiltroCategoria(v === 'todos' ? 'todos' : Number(v))} options={[{ value: 'todos', label: 'Todas as categorias' }, ...store.categorias.map(c => ({ value: String(c.id), label: c.nome }))]} placeholder="Filtrar por categoria" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Disponíveis</span>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{stats.disponiveis}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Baixos</span>
              </div>
              <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">{stats.baixos}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Críticos</span>
              </div>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{stats.criticos}</p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
              <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase">Valor Total</span>
              <p className="text-lg font-bold font-mono text-violet-800 dark:text-violet-300">{formatCurrency(stats.valorTotal)}</p>
            </div>
          </div>

          {/* Table */}
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhum produto encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Produto" sortKey="produto.nome" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Categoria" sortKey="produto.categoria_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Qtd." sortKey="qtdTotal" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 text-right whitespace-nowrap"><SortButton label="Mínima" sortKey="minima" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Status" sortKey="status.status" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap"><SortButton label="Custo" sortKey="custoTotal" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr key={item.produto.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-3 pl-4 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {item.produto.nome}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {store.categoriaNome(item.produto.categoria_id)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {item.qtdTotal}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {item.minima}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${item.status.color}`}>
                          {item.status.label}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4 font-mono font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {formatCurrency(item.custoTotal)}
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
