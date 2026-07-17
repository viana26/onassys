import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import SelectSearch from '../SelectSearch';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface FluxoCaixaProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

interface FluxoItem {
  id: string;
  data: Date;
  dataStr: string;
  tipo: string;
  categoria: string;
  descricao: string;
  pagamento: string;
  entrada: number;
  saida: number;
  saldo: number;
}

export default function FluxoCaixa({ store, isOpen, onClose }: FluxoCaixaProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroPagamento, setFiltroPagamento] = useState<string>('todos');
  const [saldoInicialInput, setSaldoInicialInput] = useState('');

  const saldoAuto = useMemo(() => {
    if (!dataInicio) return 0;
    const corte = new Date(dataInicio);
    return store.lancamentos
      .filter(l => new Date(l.data_lancamento) < corte)
      .reduce((acc, l) => acc + (l.tipo === 'receita' ? l.valor : -l.valor), 0);
  }, [store.lancamentos, dataInicio]);

  const saldoAnterior = useMemo(() => {
    const parsed = parseFloat(saldoInicialInput.replace(/[^0-9,-]/g, '').replace(',', '.'));
    if (saldoInicialInput && !isNaN(parsed)) return parsed;
    return saldoAuto;
  }, [saldoInicialInput, saldoAuto]);

  const filteredLancamentos = useMemo(() => {
    return store.lancamentos
      .filter(l => {
        if (dataInicio && new Date(l.data_lancamento) < new Date(dataInicio)) return false;
        if (dataFim) {
          const fim = new Date(dataFim);
          fim.setDate(fim.getDate() + 1);
          if (new Date(l.data_lancamento) > fim) return false;
        }
        if (filtroPagamento !== 'todos' && l.forma_pagamento !== filtroPagamento) return false;
        return true;
      })
      .sort((a, b) => new Date(a.data_lancamento).getTime() - new Date(b.data_lancamento).getTime());
  }, [store.lancamentos, dataInicio, dataFim, filtroPagamento]);

  const fluxoItems = useMemo(() => {
    let saldo = saldoAnterior;
    return filteredLancamentos.map(l => {
      const delta = l.tipo === 'receita' ? l.valor : -l.valor;
      saldo += delta;
      const dt = new Date(l.data_lancamento);
      return {
        id: l.id,
        data: dt,
        dataStr: dt.toLocaleDateString('pt-BR'),
        tipo: l.tipo,
        categoria: store.categoriaFinanceiroNome(l.categoria_id),
        descricao: l.descricao || '—',
        pagamento: l.forma_pagamento || '—',
        entrada: l.tipo === 'receita' ? l.valor : 0,
        saida: l.tipo === 'despesa' ? l.valor : 0,
        saldo,
      } as FluxoItem;
    });
  }, [filteredLancamentos, saldoAnterior, store]);

  const dailyGroups = useMemo(() => {
    const groups: { data: string; items: FluxoItem[]; saldoFinal: number }[] = [];
    let currentDay: string | null = null;
    for (const item of fluxoItems) {
      if (item.dataStr !== currentDay) {
        currentDay = item.dataStr;
        groups.push({ data: item.dataStr, items: [], saldoFinal: 0 });
      }
      groups[groups.length - 1].items.push(item);
      groups[groups.length - 1].saldoFinal = item.saldo;
    }
    return groups;
  }, [fluxoItems]);

  const dailyTotals = useMemo(() => {
    let acum = saldoAnterior;
    return dailyGroups.map(g => {
      const entrada = g.items.reduce((s, i) => s + i.entrada, 0);
      const saida = g.items.reduce((s, i) => s + i.saida, 0);
      const saldoDia = entrada - saida;
      acum += saldoDia;
      return { ...g, totalEntrada: entrada, totalSaida: saida, saldoDia, saldoAcumulado: acum, qtd: g.items.length };
    });
  }, [dailyGroups, saldoAnterior]);

  const totalEntradas = fluxoItems.reduce((s, i) => s + i.entrada, 0);
  const totalSaidas = fluxoItems.reduce((s, i) => s + i.saida, 0);
  const saldoFinal = saldoAnterior + totalEntradas - totalSaidas;

  const chartData = useMemo(() => {
    return {
      labels: fluxoItems.map(i => i.dataStr),
      datasets: [{
        label: 'Saldo Acumulado',
        data: fluxoItems.map(i => i.saldo),
        borderColor: '#d97706',
        backgroundColor: 'rgba(217,119,6,0.08)',
        fill: true,
        tension: 0.2,
        pointRadius: 2,
        pointHitRadius: 10,
        borderWidth: 2,
      }],
    };
  }, [fluxoItems]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx: any) => `Saldo: ${formatCurrency(ctx.raw)}` },
      },
    },
    scales: {
      x: {
        ticks: { color: '#a8a29e', font: { size: 8 }, maxRotation: 45 },
        grid: { color: '#e7e5e4' },
      },
      y: {
        ticks: { color: '#a8a29e', font: { size: 9 }, callback: (val: any) => formatCurrency(val) },
        grid: { color: '#e7e5e4' },
      },
    },
  };

  const exportCSV = () => {
    const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Pagamento', 'Entrada', 'Saída', 'Saldo'];
    const rows = [['Saldo Anterior', '', '', '', '', '', '', saldoAnterior.toFixed(2)]];
    for (const i of fluxoItems) {
      rows.push([
        i.dataStr,
        i.tipo === 'receita' ? 'Entrada' : 'Saída',
        i.categoria,
        i.descricao,
        i.pagamento,
        i.entrada ? i.entrada.toFixed(2) : '',
        i.saida ? i.saida.toFixed(2) : '',
        i.saldo.toFixed(2),
      ]);
    }
    rows.push(['SALDO FINAL', '', '', '', '', totalEntradas.toFixed(2), totalSaidas.toFixed(2), saldoFinal.toFixed(2)]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxo-caixa-${new Date().toISOString().split('T')[0]}.csv`;
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

    let rowsHtml = '';
    for (const d of dailyTotals) {
      rowsHtml += `<tr>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;font-family:monospace;color:#57534e">${d.data}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:center;color:#a8a29e">${d.qtd}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#059669">${formatCurrency(d.totalEntrada)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:#dc2626">${formatCurrency(d.totalSaida)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;color:${d.saldoDia >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(d.saldoDia)}</td>
        <td style="border-bottom:1px solid #e7e5e4;padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:${d.saldoAcumulado >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(d.saldoAcumulado)}</td>
      </tr>`;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Fluxo de Caixa - ${appName()}</title>
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
      <h2 style="font-size:14px;font-weight:600;color:#1c1917;margin:0">Fluxo de Caixa</h2>
      <p style="margin:2px 0 0 0;font-size:9px;color:#78716c">Gerado em: ${now}</p>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:1rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Pagamento:</strong> ${filtroPagamento === 'todos' ? 'Todos' : filtroPagamento}</td>
    <td style="border:none;text-align:right"><strong>Saldo Inicial:</strong> ${formatCurrency(saldoAnterior)}</td>
    <td style="border:none;text-align:right"><strong>Registros:</strong> ${fluxoItems.length}</td>
  </tr></table>
  <table style="width:100%;border:none;margin-bottom:1.5rem;border-collapse:collapse;font-size:9px"><tr>
    <td style="width:25%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:#ecfdf5">
      <p style="margin:0;font-size:7px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px">Entradas</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:#059669">${formatCurrency(totalEntradas)}</p>
    </td>
    <td style="width:25%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:#fef2f2">
      <p style="margin:0;font-size:7px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px">Saídas</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:#dc2626">${formatCurrency(totalSaidas)}</p>
    </td>
    <td style="width:25%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:#fffbeb">
      <p style="margin:0;font-size:7px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px">Saldo Inicial</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:#d97706">${formatCurrency(saldoAnterior)}</p>
    </td>
    <td style="width:25%;border:1px solid #d6d3d1;padding:0.5rem;text-align:center;background:${saldoFinal >= 0 ? '#ecfdf5' : '#fef2f2'}">
      <p style="margin:0;font-size:7px;font-weight:700;color:${saldoFinal >= 0 ? '#059669' : '#dc2626'};text-transform:uppercase;letter-spacing:1px">Saldo Final</p>
      <p style="margin:4px 0 0 0;font-size:15px;font-weight:700;color:${saldoFinal >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(saldoFinal)}</p>
    </td>
  </tr></table>
  <table>
    <thead><tr>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:left;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Data</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:center;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Qtd</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Entrada</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Saída</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Saldo do Dia</th>
      <th style="border-bottom:2px solid #d97706;padding:0.4rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;background:#f5f5f4;font-size:7px;text-transform:uppercase">Acumulado</th>
    </tr></thead>
    <tbody>
      <tr style="background:#fffbeb"><td colspan="4" style="padding:0.4rem 0.75rem;font-weight:700;font-size:10px;color:#d97706">Saldo Anterior</td><td style="padding:0.4rem 0.75rem;text-align:right"></td><td style="padding:0.4rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:#d97706">${formatCurrency(saldoAnterior)}</td></tr>
      ${rowsHtml}
    </tbody>
    <tfoot><tr>
      <td colspan="4" style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-weight:800;color:#1c1917;font-size:10px">SALDO FINAL:</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:${(totalEntradas - totalSaidas) >= 0 ? '#059669' : '#dc2626'}">${formatCurrency(totalEntradas - totalSaidas)}</td>
      <td style="border-top:2px solid #d97706;padding:0.5rem 0.75rem;text-align:right;font-family:monospace;font-weight:800;color:${saldoFinal >= 0 ? '#059669' : '#dc2626'};font-size:10px">${formatCurrency(saldoFinal)}</td>
    </tr></tfoot>
  </table>
  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Fluxo de Caixa | Período: ${periodoLabel}</p>
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
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Fluxo de Caixa</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Entradas, saídas e saldo acumulado por período.</p>
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
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Saldo Inicial (manual)</label>
              <input type="text" inputMode="decimal" value={saldoInicialInput} onChange={e => setSaldoInicialInput(e.target.value)}
                placeholder={formatCurrency(saldoAuto)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400 font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-gray-500 dark:text-amber-100/40">Pagamento</label>
              <SelectSearch value={filtroPagamento} onChange={v => setFiltroPagamento(v)} options={[{ value: 'todos', label: 'Todos' }, ...([...new Set(store.lancamentos.map(l => l.forma_pagamento).filter(Boolean))] as string[]).map(fp => ({ value: fp, label: fp }))]} placeholder="Filtrar por pagamento" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Saldo Inicial</span>
              <p className="text-lg font-bold font-mono text-amber-800 dark:text-amber-300">{formatCurrency(saldoAnterior)}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Entradas</span>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatCurrency(totalEntradas)}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Saídas</span>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{formatCurrency(totalSaidas)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${saldoFinal >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
              <span className={`text-[10px] font-bold uppercase ${saldoFinal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>Saldo Final</span>
              <p className={`text-lg font-bold font-mono ${saldoFinal >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{formatCurrency(saldoFinal)}</p>
            </div>
          </div>

          {/* Chart */}
          {fluxoItems.length > 1 && (
            <div className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] p-4">
              <h3 className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-3">Evolução do Saldo</h3>
              <div className="h-48">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Table */}
          {fluxoItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-amber-100/30">
              <p className="text-sm">Nenhum lançamento encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                    <th className="p-2 pl-4 whitespace-nowrap font-semibold">Data</th>
                    <th className="p-2 text-center whitespace-nowrap font-semibold">Qtd</th>
                    <th className="p-2 text-right whitespace-nowrap font-semibold">Entrada</th>
                    <th className="p-2 text-right whitespace-nowrap font-semibold">Saída</th>
                    <th className="p-2 text-right whitespace-nowrap font-semibold">Saldo do Dia</th>
                    <th className="p-2 text-right pr-4 whitespace-nowrap font-semibold">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-amber-50/30 dark:bg-amber-950/10 border-b border-amber-100 dark:border-[#22160b]">
                    <td colSpan={4} className="p-2 pl-4 font-bold text-amber-700 dark:text-amber-400 text-[10px]">Saldo Anterior</td>
                    <td className="p-2 text-right"></td>
                    <td className="p-2 pr-4 text-right font-mono font-bold text-amber-700 dark:text-amber-400">{formatCurrency(saldoAnterior)}</td>
                  </tr>
                  {dailyTotals.map(d => (
                    <tr key={d.data} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                      <td className="p-2 pl-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">{d.data}</td>
                      <td className="p-2 text-center text-gray-400 dark:text-amber-100/30">{d.qtd}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                        {formatCurrency(d.totalEntrada)}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-red-700 dark:text-red-400 whitespace-nowrap">
                        {formatCurrency(d.totalSaida)}
                      </td>
                      <td className={`p-2 text-right font-mono font-bold whitespace-nowrap ${
                        d.saldoDia >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {formatCurrency(d.saldoDia)}
                      </td>
                      <td className={`p-2 pr-4 text-right font-mono font-bold whitespace-nowrap ${
                        d.saldoAcumulado >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {formatCurrency(d.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-amber-950 dark:border-amber-100 bg-amber-50/30 dark:bg-amber-950/10">
                    <td colSpan={4} className="p-3 pl-4 font-bold text-amber-950 dark:text-amber-100">SALDO FINAL</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalEntradas - totalSaidas)}</td>
                    <td className={`p-3 pr-4 text-right font-mono font-bold text-sm ${
                      saldoFinal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {formatCurrency(saldoFinal)}
                    </td>
                  </tr>
                </tfoot>
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
