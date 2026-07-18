import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, TrendingUp, DollarSign, BadgeDollarSign } from 'lucide-react';
import { normalizarQuantidade } from '../../lib/calculos';
import SelectSearch from '../SelectSearch';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface LucratividadePedidosProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

interface PedidoLucro {
  id: string;
  cliente: string;
  data: string;
  status: string;
  statusId: number;
  custo: number;
  precoTotal: number;
  totalPago: number;
  pendente: number;
  lucroAtual: number;
}

export default function LucratividadePedidos({ store, isOpen, onClose }: LucratividadePedidosProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const dados = useMemo(() => {
    const pedidos = store.pedidos.filter(p => {
      if (dataInicio && new Date(p.data_pedido) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(p.data_pedido) > fim) return false;
      }
      if (statusFilter !== 'todos') {
        const ids = statusFilter.split(',').map(Number);
        if (!ids.includes(p.status_id)) return false;
      }
      return true;
    });

    return pedidos.map(p => {
      const itens = store.itensPedido.filter(i => i.pedido_id === p.id);
      let custo = 0;
      for (const item of itens) {
        const prod = store.produtos.find(pr => pr.id === item.produto_id);
        if (prod) {
          custo += item.quantidade_solicitada * prod.custo_producao_calculado;
        }
      }

      const totalPago = store.lancamentos
        .filter(l => l.pedido_id === p.id && l.tipo === 'receita')
        .reduce((s, l) => s + l.valor, 0);

      const pendente = Math.max(0, p.valor_total - totalPago);

      return {
        id: p.id,
        cliente: store.clientes.find(c => c.id === p.cliente_id)?.nome || '—',
        data: new Date(p.data_pedido).toLocaleDateString('pt-BR'),
        status: store.statusNome(p.status_id),
        statusId: p.status_id,
        custo,
        precoTotal: p.valor_total,
        totalPago,
        pendente,
        lucroAtual: p.valor_total - custo - pendente,
      };
    }).sort((a, b) => b.lucroAtual - a.lucroAtual);
  }, [store.pedidos, store.itensPedido, store.produtos, store.lancamentos, store.clientes, dataInicio, dataFim, statusFilter]);

  const totais = useMemo(() => ({
    qtd: dados.length,
    custo: dados.reduce((s, r) => s + r.custo, 0),
    receita: dados.reduce((s, r) => s + r.precoTotal, 0),
    pago: dados.reduce((s, r) => s + r.totalPago, 0),
    pendente: dados.reduce((s, r) => s + r.pendente, 0),
    lucro: dados.reduce((s, r) => s + r.lucroAtual, 0),
  }), [dados]);

  const exportCSV = () => {
    const headers = ['Pedido', 'Cliente', 'Data', 'Status', 'Preço Total', 'Custo Geral', 'Total Pago', 'Pendente', 'Lucro Atual'];
    const rows = dados.map(r => [
      r.id.slice(-6).toUpperCase(),
      r.cliente,
      r.data,
      r.status,
      r.precoTotal.toFixed(2),
      r.custo.toFixed(2),
      r.totalPago.toFixed(2),
      r.pendente.toFixed(2),
      r.lucroAtual.toFixed(2),
    ].join(','));
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lucratividade-pedidos-${new Date().toISOString().split('T')[0]}.csv`;
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

    const rowsHtml = dados.map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
      return `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-family:monospace;font-size:10px;color:#78716c;background:${bg}">#${r.id.slice(-6).toUpperCase()}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-weight:600;color:#1c1917;background:${bg}">${r.cliente}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;color:#57534e;font-size:10px;background:${bg}">${r.data}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;font-size:10px;color:#57534e;background:${bg}">${r.status}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#1c1917;background:${bg}">${formatCurrency(r.precoTotal)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#dc2626;background:${bg}">${formatCurrency(r.custo)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#059669;background:${bg}">${formatCurrency(r.totalPago)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;color:#d97706;background:${bg}">${formatCurrency(r.pendente)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:${r.lucroAtual >= 0 ? '#059669' : '#dc2626'};background:${bg}">${formatCurrency(r.lucroAtual)}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Lucratividade por Pedido - ${appName()}</title>
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Lucratividade por Pedido</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center">
      <p style="margin:0;font-size:8px;font-weight:700;color:#78716c;text-transform:uppercase">Pedidos</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#1c1917">${totais.qtd}</p>
    </td>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:8px;font-weight:700;color:#dc2626;text-transform:uppercase">Custo Total</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#dc2626">${formatCurrency(totais.custo)}</p>
    </td>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#f0fdf4">
      <p style="margin:0;font-size:8px;font-weight:700;color:#059669;text-transform:uppercase">Preço Total</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#059669">${formatCurrency(totais.receita)}</p>
    </td>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:8px;font-weight:700;color:#10b981;text-transform:uppercase">Total Pago</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#10b981">${formatCurrency(totais.pago)}</p>
    </td>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:#fffbeb">
      <p style="margin:0;font-size:8px;font-weight:700;color:#d97706;text-transform:uppercase">Pendente</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:#d97706">${formatCurrency(totais.pendente)}</p>
    </td>
    <td style="width:16.6%;border:1px solid #d6d3d1;padding:0.75rem;text-align:center;background:${totais.lucro >= 0 ? '#f0fdf4' : '#fef2f2'}">
      <p style="margin:0;font-size:8px;font-weight:700;color:${totais.lucro >= 0 ? '#059669' : '#dc2626'};text-transform:uppercase">Lucro Líquido</p>
      <p style="margin:6px 0 0 0;font-size:18px;font-weight:700;color:${totais.lucro >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(totais.lucro)}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Pedido</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Cliente</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Data</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Status</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Preço Total</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Custo Geral</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Total Pago</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Pendente</th>
      <th style="border-bottom:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:8px;text-transform:uppercase">Lucro Atual</th>
    </tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Lucratividade por Pedido | Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
    }
    onClose();
  };

  if (!isOpen) return null;

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: '2,3,4,5', label: 'Ativos + Entregues' },
    { value: '5', label: 'Apenas Entregues' },
    { value: '2,3,4', label: 'Ativos (não entregues)' },
    { value: '1,2,3,4,5', label: 'Todos (exceto cancelados)' },
    { value: '1', label: 'Apenas Rascunho' },
    { value: '6', label: 'Cancelados' },
  ];

  const pendentesTotal = dados.reduce((s, r) => s + r.pendente, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-6xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Lucratividade por Pedido</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Custo geral, preço total, recebido vs pendente e lucro atual por pedido.</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Status dos Pedidos</label>
              <SelectSearch value={statusFilter} onChange={v => setStatusFilter(v)} options={statusOptions} placeholder="Filtrar por status" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TOTAIS */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-800">
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Pedidos</span>
              <p className="text-lg font-bold font-mono text-amber-950 dark:text-amber-100">{totais.qtd}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Custo Total</span>
              <p className="text-lg font-bold font-mono text-red-700 dark:text-red-400">{formatCurrency(totais.custo)}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Preço Total</span>
              <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(totais.receita)}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
              <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">Total Pago</span>
              <p className="text-lg font-bold font-mono text-green-700 dark:text-green-400">{formatCurrency(totais.pago)}</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Pendente</span>
              <p className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">{formatCurrency(totais.pendente)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${totais.lucro >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
              <span className={`text-[10px] font-bold uppercase ${totais.lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Lucro Líquido</span>
              <p className={`text-lg font-bold font-mono ${totais.lucro >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                {formatCurrency(totais.lucro)}
              </p>
              {totais.receita > 0 && (
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">
                  Margem: {((totais.lucro / totais.receita) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {dados.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhum pedido encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-3 pl-4 whitespace-nowrap">Pedido</th>
                    <th className="p-3 whitespace-nowrap">Cliente</th>
                    <th className="p-3 whitespace-nowrap">Data</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 text-right whitespace-nowrap">Preço Total</th>
                    <th className="p-3 text-right whitespace-nowrap">Custo Geral</th>
                    <th className="p-3 text-right whitespace-nowrap">Total Pago</th>
                    <th className="p-3 text-right whitespace-nowrap">Pendente</th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap">Lucro Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map(r => (
                    <tr key={r.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-3 pl-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap text-[10px]">
                        {r.id}
                      </td>
                      <td className="p-3 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {r.cliente}
                      </td>
                      <td className="p-3 text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                        {r.data}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                          ${r.statusId === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' : ''}
                          ${r.statusId === 2 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}
                          ${r.statusId === 3 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : ''}
                          ${r.statusId === 4 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : ''}
                          ${r.statusId === 5 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
                          ${r.statusId === 6 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : ''}
                        `}>{r.status}</span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                        {formatCurrency(r.precoTotal)}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatCurrency(r.custo)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(r.totalPago)}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${r.pendente > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                        {r.pendente > 0 ? formatCurrency(r.pendente) : '—'}
                      </td>
                      <td className={`p-3 text-right pr-4 font-mono font-bold whitespace-nowrap ${r.lucroAtual >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(r.lucroAtual)}
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
