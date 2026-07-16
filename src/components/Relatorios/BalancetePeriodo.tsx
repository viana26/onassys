import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { X, Download, Printer, Filter, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const appName = () => localStorage.getItem('appName') || 'Mini Fábrica';
const getLogoUrl = (store: MiniFactoryStore) => store.dadosEmpresa?.logo_url || '';
const getSlogan = (store: MiniFactoryStore) => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';

interface BalancetePeriodoProps {
  store: MiniFactoryStore;
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryGroup {
  categoriaId: number;
  categoriaNome: string;
  quantidade: number;
  total: number;
}

const greenShades = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#047857', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#a7f3d0'];
const redShades = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#b91c1c', '#991b1b', '#e11d48', '#be123c', '#fb7185', '#f43f5e'];

export default function BalancetePeriodo({ store, isOpen, onClose }: BalancetePeriodoProps) {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos');

  const filteredLancamentos = useMemo(() => {
    return store.lancamentos.filter(l => {
      if (dataInicio && new Date(l.data_lancamento) < new Date(dataInicio)) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(l.data_lancamento) > fim) return false;
      }
      if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
      return true;
    });
  }, [store.lancamentos, dataInicio, dataFim, filtroTipo]);

  const receitas = filteredLancamentos.filter(l => l.tipo === 'receita');
  const despesas = filteredLancamentos.filter(l => l.tipo === 'despesa');
  const totalReceitas = receitas.reduce((s, l) => s + l.valor, 0);
  const totalDespesas = despesas.reduce((s, l) => s + l.valor, 0);
  const resultadoLiquido = totalReceitas - totalDespesas;

  const receitasPorCategoria = useMemo(() => {
    const map = new Map<number, CategoryGroup>();
    for (const l of receitas) {
      const exist = map.get(l.categoria_id);
      if (exist) {
        exist.quantidade++;
        exist.total += l.valor;
      } else {
        map.set(l.categoria_id, {
          categoriaId: l.categoria_id,
          categoriaNome: store.categoriaFinanceiroNome(l.categoria_id),
          quantidade: 1,
          total: l.valor,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [receitas, store]);

  const despesasPorCategoria = useMemo(() => {
    const map = new Map<number, CategoryGroup>();
    for (const l of despesas) {
      const exist = map.get(l.categoria_id);
      if (exist) {
        exist.quantidade++;
        exist.total += l.valor;
      } else {
        map.set(l.categoria_id, {
          categoriaId: l.categoria_id,
          categoriaNome: store.categoriaFinanceiroNome(l.categoria_id),
          quantidade: 1,
          total: l.valor,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [despesas, store]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#57534e', font: { size: 8 }, boxWidth: 10, padding: 4 } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${formatCurrency(ctx.raw)} (${((ctx.raw / (ctx.dataset.data.reduce((a: number, b: number) => a + b, 0))) * 100).toFixed(1)}%)`,
        },
      },
    },
    cutout: '60%',
  };

  const makeDoughnutData = (groups: CategoryGroup[], colors: string[]) => ({
    labels: groups.map(g => g.categoriaNome),
    datasets: [{ data: groups.map(g => g.total), backgroundColor: colors.slice(0, groups.length), borderWidth: 0, hoverOffset: 4 }],
  });

  const doughnutReceitas = useMemo(() => makeDoughnutData(receitasPorCategoria, greenShades), [receitasPorCategoria]);
  const doughnutDespesas = useMemo(() => makeDoughnutData(despesasPorCategoria, redShades), [despesasPorCategoria]);

  const getPrintChartHtml = (groups: CategoryGroup[], titulo: string, corTotal: string, cores: string[]) => {
    if (groups.length === 0) return '';
    const total = groups.reduce((s, g) => s + g.total, 0);
    const parts = groups.map((g, i) => {
      const pct = (g.total / total) * 100;
      return { nome: g.categoriaNome, total: g.total, pct, cor: cores[i % cores.length] };
    });
    let gradientParts = '';
    let acum = 0;
    for (const p of parts) {
      const end = acum + p.pct;
      gradientParts += `${p.cor} ${acum}% ${end}%${end < 100 ? ',' : ''}`;
      acum = end;
    }
    const gradient = `conic-gradient(${gradientParts})`;
    let legendHtml = '';
    for (const p of parts) {
      legendHtml += `<div style="display:flex;align-items:center;gap:0.25rem;margin-bottom:0.15rem">
        <div style="width:8px;height:8px;border-radius:2px;background:${p.cor};flex-shrink:0"></div>
        <span style="font-size:7px;color:#525252;flex:1">${p.nome}</span>
        <span style="font-size:7px;font-weight:600;color:#1c1917;font-family:monospace">${formatCurrency(p.total)}</span>
        <span style="font-size:6px;color:#a3a3a3">(${p.pct.toFixed(1)}%)</span>
      </div>`;
    }
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
        <div style="font-size:9px;font-weight:700;color:${corTotal};text-transform:uppercase;letter-spacing:0.05em;text-align:center">${titulo}</div>
        <div style="position:relative;width:130px;height:130px;border-radius:50%;background:${gradient};flex-shrink:0">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:55px;height:55px;border-radius:50%;background:white"></div>
        </div>
        <div style="width:100%">${legendHtml}</div>
      </div>`;
  };

  const exportCSV = () => {
    const rows: string[] = [];
    rows.push('CATEGORIA,VALOR');
    rows.push('--- RECEITAS ---,');
    for (const g of receitasPorCategoria) {
      rows.push(`${g.categoriaNome},${g.total.toFixed(2)}`);
    }
    rows.push(`Subtotal Receitas,${totalReceitas.toFixed(2)}`);
    rows.push('--- DESPESAS ---,');
    for (const g of despesasPorCategoria) {
      rows.push(`${g.categoriaNome},${g.total.toFixed(2)}`);
    }
    rows.push(`Subtotal Despesas,${totalDespesas.toFixed(2)}`);
    rows.push(`RESULTADO LÍQUIDO,${resultadoLiquido.toFixed(2)}`);
    const csv = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balancete-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupPrintRows = (groups: CategoryGroup[], label: string, total: number, isReceita: boolean, totalCount: number) => {
    const color = isReceita ? '#047857' : '#b91c1c';
    const sectionBg = isReceita ? '#ecfdf5' : '#fef2f2';
    const subtotalBg = isReceita ? '#ecfdf5' : '#fef2f2';
    let html = `<tr style="background:${sectionBg}66"><td colspan="3" style="padding:0.5rem 1rem;font-weight:700;font-size:10px;color:${color};text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #fef3c7">${label}</td></tr>`;
    for (const g of groups) {
      html += `<tr style="border-bottom:1px solid rgba(254,243,199,0.5)">
        <td style="padding:0.5rem 1rem 0.5rem 1.5rem;color:#525252">${g.categoriaNome}</td>
        <td style="padding:0.5rem 1rem;text-align:center;color:#a3a3a3;font-size:10px">${g.quantidade}</td>
        <td style="padding:0.5rem 1rem;text-align:right;font-family:monospace;font-weight:600;color:${color}">${formatCurrency(g.total)}</td>
      </tr>`;
    }
    html += `<tr style="background:${subtotalBg}33">
      <td style="padding:0.5rem 1rem;font-weight:700;color:#2e2315">Subtotal ${label}</td>
      <td style="padding:0.5rem 1rem;text-align:center;color:#a3a3a3;font-size:10px">${totalCount}</td>
      <td style="padding:0.5rem 1rem;text-align:right;font-family:monospace;font-weight:700;color:${color}">${formatCurrency(total)}</td>
    </tr>`;
    return html;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const periodoLabel = `${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '—'} a ${dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : '—'}`;
    const now = new Date().toLocaleString('pt-BR');
    const logoUrl = getLogoUrl(store);
    const cnpjHtml = store.dadosEmpresa?.cnpj ? `<p style="margin:0;font-size:9px;color:#a8a29e">CNPJ: ${store.dadosEmpresa.cnpj}</p>` : '';

    const receitasHtml = groupPrintRows(receitasPorCategoria, 'RECEITAS', totalReceitas, true, receitas.length);
    const despesasHtml = groupPrintRows(despesasPorCategoria, 'DESPESAS', totalDespesas, false, despesas.length);
    const resultColor = resultadoLiquido >= 0 ? '#059669' : '#dc2626';
    const resultLabel = resultadoLiquido >= 0 ? 'LUCRO LÍQUIDO' : 'PREJUÍZO LÍQUIDO';

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Balancete por Período - ${appName()}</title>
<style>
  @page { margin: 1.5cm; size: A4 portrait; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; color: #1c1917; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
</style></head><body>
  <table style="width:100%;border:none;margin-bottom:0.5rem"><tr>
    <td style="width:auto;vertical-align:middle;border:none;padding-right:0.5rem">
      ${logoUrl ? `<img src="${logoUrl}" style="max-width:48px;height:auto;border-radius:8px;display:block" />` : ''}
    </td>
    <td style="vertical-align:middle;border:none">
      <div style="font-size:16px;font-weight:800;color:#d97706;line-height:1.2">Amor em Fatias ZD</div>
      <div style="font-size:10px;color:#78716c;margin-top:1px">Doces e Salgados</div>
      ${cnpjHtml ? `<div style="font-size:8px;color:#a8a29e;margin-top:1px">${store.dadosEmpresa?.cnpj || ''}</div>` : ''}
    </td>
    <td style="width:auto;text-align:right;vertical-align:middle;border:none;padding-left:1rem">
      <div style="font-size:11px;font-weight:600;color:#1c1917;white-space:nowrap">Balancete por Período</div>
      <div style="font-size:8px;color:#78716c;margin-top:1px;white-space:nowrap">Gerado em: ${now}</div>
    </td>
  </tr></table>
  <div style="border-bottom:2px solid #d97706;margin-bottom:0.75rem"></div>
  <table style="width:100%;border:none;margin-bottom:1rem;font-size:9px;color:#57534e"><tr>
    <td style="border:none"><strong>Período:</strong> ${periodoLabel}</td>
    <td style="border:none"><strong>Tipo:</strong> ${filtroTipo === 'todos' ? 'Todas as movimentações' : filtroTipo === 'receita' ? 'Apenas Receitas' : 'Apenas Despesas'}</td>
    <td style="border:none;text-align:right"><strong>Registros:</strong> ${filteredLancamentos.length}</td>
  </tr></table>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1rem">
    <div style="padding:0.75rem;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;text-align:left">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
        <span style="font-size:10px;font-weight:700;color:#047857;text-transform:uppercase">Receitas</span>
      </div>
      <p style="margin:0;font-size:18px;font-weight:700;color:#065f46;font-family:monospace">${formatCurrency(totalReceitas)}</p>
    </div>
    <div style="padding:0.75rem;background:#fef2f2;border-radius:12px;border:1px solid #fecaca;text-align:left">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
        <span style="font-size:10px;font-weight:700;color:#b91c1c;text-transform:uppercase">Despesas</span>
      </div>
      <p style="margin:0;font-size:18px;font-weight:700;color:#991b1b;font-family:monospace">${formatCurrency(totalDespesas)}</p>
    </div>
    <div style="padding:0.75rem;background:${resultadoLiquido >= 0 ? '#ecfdf5' : '#fef2f2'};border-radius:12px;border:1px solid ${resultadoLiquido >= 0 ? '#a7f3d0' : '#fecaca'};text-align:left">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem">
        <span style="font-size:10px;font-weight:700;color:${resultColor};text-transform:uppercase">${resultLabel}</span>
      </div>
      <p style="margin:0;font-size:18px;font-weight:700;color:${resultColor};font-family:monospace">${formatCurrency(resultadoLiquido)}</p>
    </div>
  </div>

  <div style="display:flex;gap:1rem;align-items:flex-start">
    <div style="flex:0 0 auto;width:240px;display:flex;flex-direction:column;gap:0.5rem">
      ${getPrintChartHtml(receitasPorCategoria, 'Receitas', '#047857', greenShades)}
      ${getPrintChartHtml(despesasPorCategoria, 'Despesas', '#b91c1c', redShades)}
    </div>
    <div style="flex:1;min-width:0;background:#ffffff;border-radius:12px;border:1px solid #fef3c7;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:rgba(255,251,235,0.4)">
          <th style="padding:0.75rem 0.75rem 0.75rem 1rem;text-align:left;font-weight:600;color:#2e2315;font-size:11px;border-bottom:1px solid #fef3c7;white-space:nowrap">Categoria</th>
          <th style="padding:0.75rem 0.75rem;text-align:center;font-weight:600;color:#2e2315;font-size:11px;border-bottom:1px solid #fef3c7;white-space:nowrap">Qtd</th>
          <th style="padding:0.75rem 1rem 0.75rem 0.75rem;text-align:right;font-weight:600;color:#2e2315;font-size:11px;border-bottom:1px solid #fef3c7;white-space:nowrap">Valor</th>
        </tr></thead>
        <tbody>
          ${receitasHtml}
          ${despesasHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:0.75rem 0.75rem 0.75rem 1rem;text-align:right;font-weight:700;color:#2e2315;border-top:2px solid #2e2315;font-size:11px">${resultLabel}:</td>
            <td style="padding:0.75rem 1rem 0.75rem 0.75rem;text-align:right;font-family:monospace;font-weight:700;color:${resultColor};border-top:2px solid #2e2315;font-size:13px">${formatCurrency(resultadoLiquido)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>

  <div style="margin-top:2.5rem;padding-top:1rem;border-top:1px solid #d6d3d1;font-size:7px;color:#a8a29e;text-align:center">
    <p style="margin:0">${appName()} — ${getSlogan(store)} | Gerado em ${now}</p>
    <p style="margin:2px 0 0 0">Balancete por Período: ${periodoLabel}</p>
  </div>
</body></html>`);
    printWindow.document.close();
    printWindow.print();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans">
      <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-4xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-100 dark:border-[#2d1e0d]">
          <div>
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Balancete por Período</h2>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Receitas, despesas e resultado líquido por categoria.</p>
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
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}
                className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400">
                <option value="todos">Todas</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Receitas</span>
              </div>
              <p className="text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{formatCurrency(totalReceitas)}</p>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
                <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">Despesas</span>
              </div>
              <p className="text-lg font-bold font-mono text-red-800 dark:text-red-300">{formatCurrency(totalDespesas)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${resultadoLiquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}`}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className={resultadoLiquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
                <span className={`text-[10px] font-bold uppercase ${resultadoLiquido >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {resultadoLiquido >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                </span>
              </div>
              <p className={`text-lg font-bold font-mono ${resultadoLiquido >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>{formatCurrency(resultadoLiquido)}</p>
            </div>
          </div>

          {/* Charts + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              {receitasPorCategoria.length > 0 && (
                <div className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] p-4">
                  <h4 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">Receitas</h4>
                  <div className="h-48 flex items-center justify-center">
                    <Doughnut data={doughnutReceitas} options={doughnutOptions} />
                  </div>
                </div>
              )}
              {despesasPorCategoria.length > 0 && (
                <div className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] p-4">
                  <h4 className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">Despesas</h4>
                  <div className="h-48 flex items-center justify-center">
                    <Doughnut data={doughnutDespesas} options={doughnutOptions} />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto max-h-[39rem] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b] sticky top-0">
                    <th className="p-3 pl-4 whitespace-nowrap font-semibold">Categoria</th>
                    <th className="p-3 text-center whitespace-nowrap font-semibold">Qtd</th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Receitas section */}
                  {receitasPorCategoria.length > 0 && (
                    <>
                      <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                        <td colSpan={3} className="p-2 pl-4 font-bold text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-wider border-b border-amber-100 dark:border-[#22160b]">
                          Receitas
                        </td>
                      </tr>
                      {receitasPorCategoria.map(g => (
                        <tr key={`rec-${g.categoriaId}`} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                          <td className="p-2 pl-6 text-gray-600 dark:text-amber-100/60">{g.categoriaNome}</td>
                          <td className="p-2 text-center text-gray-400 dark:text-amber-100/30 text-[10px]">{g.quantidade}</td>
                          <td className="p-2 pr-4 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(g.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50/20 dark:bg-emerald-950/10">
                        <td className="p-2 pl-4 font-bold text-amber-950 dark:text-amber-100">Subtotal Receitas</td>
                        <td className="p-2 text-center text-gray-400 dark:text-amber-100/30 text-[10px]">{receitas.reduce((s, l) => s + 1, 0)}</td>
                        <td className="p-2 pr-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(totalReceitas)}</td>
                      </tr>
                    </>
                  )}

                  {/* Despesas section */}
                  {despesasPorCategoria.length > 0 && (
                    <>
                      <tr className="bg-red-50/40 dark:bg-red-950/20">
                        <td colSpan={3} className="p-2 pl-4 font-bold text-red-700 dark:text-red-400 text-[10px] uppercase tracking-wider border-b border-amber-100 dark:border-[#22160b]">
                          Despesas
                        </td>
                      </tr>
                      {despesasPorCategoria.map(g => (
                        <tr key={`desp-${g.categoriaId}`} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                          <td className="p-2 pl-6 text-gray-600 dark:text-amber-100/60">{g.categoriaNome}</td>
                          <td className="p-2 text-center text-gray-400 dark:text-amber-100/30 text-[10px]">{g.quantidade}</td>
                          <td className="p-2 pr-4 text-right font-mono font-semibold text-red-700 dark:text-red-400">{formatCurrency(g.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-red-50/20 dark:bg-red-950/10">
                        <td className="p-2 pl-4 font-bold text-amber-950 dark:text-amber-100">Subtotal Despesas</td>
                        <td className="p-2 text-center text-gray-400 dark:text-amber-100/30 text-[10px]">{despesas.reduce((s, l) => s + 1, 0)}</td>
                        <td className="p-2 pr-4 text-right font-mono font-bold text-red-700 dark:text-red-400">{formatCurrency(totalDespesas)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
                {(receitasPorCategoria.length > 0 || despesasPorCategoria.length > 0) && (
                  <tfoot>
                    <tr className="border-t-2 border-amber-950 dark:border-amber-100">
                      <td className="p-3 pl-4 font-bold text-amber-950 dark:text-amber-100">
                        {resultadoLiquido >= 0 ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                      </td>
                      <td className="p-3 text-center"></td>
                      <td className={`p-3 pr-4 text-right font-mono font-bold text-sm ${
                        resultadoLiquido >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {formatCurrency(resultadoLiquido)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-t border-amber-100 dark:border-[#2d1e0d] bg-amber-50/30 dark:bg-amber-950/10">
          <button onClick={onClose}
            className="flex-1 sm:flex-none bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 px-4 rounded-xl text-center text-xs">
            Fechar
          </button>
          <button onClick={exportCSV}
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs flex items-center justify-center gap-1.5">
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={handlePrint}
            className="flex-1 sm:flex-none bg-amber-700 hover:bg-amber-800 text-white font-semibold py-2.5 px-4 rounded-xl text-center text-xs flex items-center justify-center gap-1.5">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
