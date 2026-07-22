import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { MiniFactoryStore } from '../lib/store';
import { formatarNumero } from '../lib/calculos';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface DashboardChartsProps {
  store: MiniFactoryStore;
}

export default function DashboardCharts({ store }: DashboardChartsProps) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const chartTextColor = '#78716c';
  const chartGridColor = 'rgba(120, 113, 108, 0.15)';

  // ---- Line Chart: Receitas vs Despesas (últimos 30 dias) ----
  const lineChartData = useMemo(() => {
    const dias: string[] = [];
    const receitas: number[] = [];
    const despesas: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dias.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));

      const receita = store.lancamentos
        .filter(l => l.data_lancamento.startsWith(key) && l.tipo === 'receita')
        .reduce((s, l) => s + l.valor, 0);
      const despesa = store.lancamentos
        .filter(l => l.data_lancamento.startsWith(key) && l.tipo === 'despesa')
        .reduce((s, l) => s + l.valor, 0);

      receitas.push(receita);
      despesas.push(despesa);
    }

    return {
      labels: dias,
      datasets: [
        {
          label: 'Receitas',
          data: receitas,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
        {
          label: 'Despesas',
          data: despesas,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [store.lancamentos]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: chartTextColor, font: { size: 10 }, boxWidth: 12, padding: 8 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor, font: { size: 8 }, maxRotation: 0 },
        grid: { color: chartGridColor },
      },
      y: {
        ticks: {
          color: chartTextColor,
          font: { size: 8 },
          callback: (val: any) => formatCurrency(val),
        },
        grid: { color: chartGridColor },
      },
    },
  };

  // ---- Doughnut: Receita vs Despesa do mês ----
  const doughnutData = useMemo(() => {
    const receitas = store.lancamentos
      .filter(l => {
        const d = new Date(l.data_lancamento);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && l.tipo === 'receita';
      })
      .reduce((s, l) => s + l.valor, 0);
    const despesas = store.lancamentos
      .filter(l => {
        const d = new Date(l.data_lancamento);
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual && l.tipo === 'despesa';
      })
      .reduce((s, l) => s + l.valor, 0);

    return {
      labels: ['Receitas', 'Despesas'],
      datasets: [{
        data: [receitas, despesas],
        backgroundColor: ['#059669', '#dc2626'],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    };
  }, [store.lancamentos, mesAtual, anoAtual]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: chartTextColor, font: { size: 10 }, boxWidth: 12, padding: 8 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${formatCurrency(ctx.raw)} (${formatarNumero((ctx.raw / (ctx.dataset.data[0] + ctx.dataset.data[1])) * 100, 1)}%)`,
        },
      },
    },
    cutout: '65%',
  };

  const cardStyle = "bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line Chart - Fluxo de Caixa 30 dias */}
      <div className={`${cardStyle} lg:col-span-1`}>
        <h3 className="font-display font-semibold text-sm text-amber-950 dark:text-amber-100 mb-3">
          Fluxo de Caixa (30 dias)
        </h3>
        <div className="h-52">
          <Line data={lineChartData} options={lineOptions} />
        </div>
      </div>

      {/* Doughnut - Mês Atual */}
      <div className={cardStyle}>
        <h3 className="font-display font-semibold text-sm text-amber-950 dark:text-amber-100 mb-3">
          Resumo do Mês
        </h3>
        <div className="h-52 flex items-center justify-center">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
}
