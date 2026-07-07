import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { X, Search, Download, Printer, Calendar, Filter } from 'lucide-react';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface RelatorioPedidosProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

export default function RelatorioPedidos({ store, isOpen, onClose }: RelatorioPedidosProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<number | 'todos'>('todos');
  const [filtroCliente, setFiltroCliente] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPedidos = useMemo(() => {
    return store.pedidos.filter(p => {
      if (dataInicio && new Date(p.data_pedido) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(p.data_pedido) > fim) return false;
      }
      if (filtroStatus !== 'todos' && p.status_id !== filtroStatus) return false;
      if (filtroCliente !== 'todos' && p.cliente_id !== filtroCliente) return false;
      if (searchTerm) {
        const cli = store.clientes.find(c => c.id === p.cliente_id)?.nome.toLowerCase() || '';
        if (!cli.includes(searchTerm.toLowerCase()) && !p.id.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [store.pedidos, dataInicio, dataFim, filtroStatus, filtroCliente, searchTerm]);

  const totalValor = filteredPedidos.reduce((s, p) => s + p.valor_total, 0);

  const exportCSV = () => {
    const headers = ['Código', 'Cliente', 'Data Pedido', 'Entrega Prevista', 'Valor Total', 'Status'];
    const rows = filteredPedidos.map(p => {
      const cli = store.clientes.find(c => c.id === p.cliente_id)?.nome || 'N/A';
      return [
        p.id.substring(4).toUpperCase(),
        `"${cli}"`,
        new Date(p.data_pedido).toLocaleDateString('pt-BR'),
        new Date(p.data_entrega_prevista).toLocaleDateString('pt-BR'),
        p.valor_total.toFixed(2),
        store.statusNome(p.status_id),
      ].join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-pedidos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const statusLabel = filtroStatus === 'todos' ? 'Todos' : store.statusNome(filtroStatus);
    const periodoLabel = `${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '—'} a ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : '—'}`;
    const now = new Date().toLocaleString('pt-BR');
    const totalLabel = formatCurrency(totalValor);
    const ticketLabel = filteredPedidos.length > 0 ? formatCurrency(totalValor / filteredPedidos.length) : 'R$ 0,00';

    const rowsHtml = filteredPedidos.map((p, idx) => {
      const cli = store.clientes.find(c => c.id === p.cliente_id);
      const itens = store.itensPedido.filter(it => it.pedido_id === p.id);
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-family:monospace;font-weight:600;color:#d97706;background:${bg}">#${p.id.substring(4).toUpperCase()}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${cli?.nome || 'N/A'}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-family:monospace;color:#57534e;background:${bg}">${new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-family:monospace;color:#57534e;background:${bg}">${new Date(p.data_entrega_prevista).toLocaleDateString('pt-BR')}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:center;color:#57534e;background:${bg}">${itens.length}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#1c1917;background:${bg}">${formatCurrency(p.valor_total)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;background:${bg}">${store.statusNome(p.status_id)}</td>
      </tr>`;
    }).join('');

    const logoUrl = getLogoUrl(store);
    const cnpjHtml = store.dadosEmpresa?.cnpj ? `<p style="margin:0;font-size:9px;color:#a8a29e">CNPJ: ${store.dadosEmpresa.cnpj}</p>` : '';

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Relatório de Pedidos - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 portrait; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1c1917; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  .no-print { display: none !important; }
  @media print { .no-print { display: none !important; } }
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Relatório de Pedidos</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Status:</strong> ${statusLabel}</td>
    <td style="border:none;text-align:right"><strong>Total de pedidos:</strong> ${filteredPedidos.length}</td>
  </tr></table>

  <table style="width:100%;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fff7ed">
      <p style="margin:0;font-size:8px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px">Total Pedidos</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#1c1917">${filteredPedidos.length}</p>
    </td>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:8px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px">Valor Total</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#1c1917">${totalLabel}</p>
    </td>
    <td style="width:33%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#eef2ff">
      <p style="margin:0;font-size:8px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px">Ticket Médio</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#1c1917">${ticketLabel}</p>
    </td>
  </tr></table>

  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Código</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Cliente</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Data Pedido</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Entrega</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Itens</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Valor Total</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Status</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
    <tfoot><tr>
      <td colspan="5" style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;font-size:10px">TOTAL GERAL:</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#d97706;font-size:10px">${totalLabel}</td>
      <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;font-family:monospace;font-weight:600;color:#1c1917;font-size:10px">${filteredPedidos.length} pedidos</td>
    </tr></tfoot>
  </table>

  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Relatório de Pedidos | Total de ${filteredPedidos.length} pedido(s) | Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-xl flex flex-col border-t border-amber-100">
        {/* Header */}
        <div className="p-6 border-b border-amber-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <span className="text-amber-800 dark:text-amber-400 text-[10px] font-semibold font-mono tracking-wider uppercase">Relatório</span>
            <h3 className="font-display font-semibold text-lg text-amber-950 mt-0.5">Relatório de Pedidos</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-amber-950 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-amber-100 bg-amber-50/20 space-y-4 no-print">
          <div className="flex items-center gap-2 text-amber-950 font-semibold">
            <Filter size={14} /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-amber-900/60 uppercase">Data Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full p-2 border border-amber-200 rounded-lg text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-amber-900/60 uppercase">Data Fim</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full p-2 border border-amber-200 rounded-lg text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-amber-900/60 uppercase">Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
                className="w-full p-2 border border-amber-200 rounded-lg text-xs bg-white">
                <option value="todos">Todos</option>
                {store.statusPedido.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-amber-900/60 uppercase">Cliente</label>
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                className="w-full p-2 border border-amber-200 rounded-lg text-xs bg-white">
                <option value="todos">Todos</option>
                {store.clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400"><Search size={14} /></span>
            <input type="text" placeholder="Buscar por cliente ou código..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-amber-100 focus:outline-none focus:border-amber-400 transition" />
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {filteredPedidos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum pedido encontrado com os filtros selecionados.</p>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-bold text-amber-900/60 uppercase">Total Pedidos</p>
                  <p className="text-2xl font-bold font-display text-amber-950 mt-1">{filteredPedidos.length}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[9px] font-bold text-emerald-900/60 uppercase">Valor Total</p>
                  <p className="text-2xl font-bold font-display text-emerald-800 mt-1">{formatCurrency(totalValor)}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[9px] font-bold text-indigo-900/60 uppercase">Ticket Médio</p>
                  <p className="text-2xl font-bold font-display text-indigo-800 mt-1">
                    {filteredPedidos.length > 0 ? formatCurrency(totalValor / filteredPedidos.length) : 'R$ 0,00'}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-amber-50/30 text-amber-900 border-b border-amber-100">
                      <th className="p-3 pl-0 whitespace-nowrap font-semibold text-[10px]">Código</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Cliente</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Data Pedido</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Entrega</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Itens</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Valor</th>
                      <th className="p-3 whitespace-nowrap font-semibold text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPedidos.map(p => {
                      const cli = store.clientes.find(c => c.id === p.cliente_id);
                      const itens = store.itensPedido.filter(it => it.pedido_id === p.id);
                      return (
                        <tr key={p.id} className="border-b border-amber-50/50">
                          <td className="p-3 pl-0 font-mono font-bold text-amber-700 whitespace-nowrap">#{p.id.substring(4).toUpperCase()}</td>
                          <td className="p-3 font-semibold text-amber-950 whitespace-nowrap">{cli?.nome || 'N/A'}</td>
                          <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{new Date(p.data_pedido).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 font-mono text-gray-600 whitespace-nowrap">{new Date(p.data_entrega_prevista).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 whitespace-nowrap">{itens.length} itens</td>
                          <td className="p-3 font-bold font-mono text-amber-900 whitespace-nowrap">{formatCurrency(p.valor_total)}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase
                              ${p.status_id === 1 ? 'bg-gray-100 text-gray-600' : ''}
                              ${p.status_id === 2 ? 'bg-amber-100 text-amber-900' : ''}
                              ${p.status_id === 3 ? 'bg-indigo-100 text-indigo-700' : ''}
                              ${p.status_id === 4 ? 'bg-emerald-100 text-emerald-800' : ''}
                              ${p.status_id === 5 ? 'bg-gray-800 text-white' : ''}
                              ${p.status_id === 6 ? 'bg-red-100 text-red-700' : ''}
                            `}>{store.statusNome(p.status_id)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-amber-700 font-bold text-amber-950">
                      <td colSpan={5} className="p-3 text-right">Total:</td>
                      <td className="p-3 font-mono">{formatCurrency(totalValor)}</td>
                      <td className="p-3">{filteredPedidos.length} pedidos</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-amber-50/20 border-t border-amber-100 flex items-center justify-end gap-3 no-print">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition text-xs">
            Fechar
          </button>
          <button onClick={exportCSV}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={handlePrint}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
