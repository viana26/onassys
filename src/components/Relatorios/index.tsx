import React, { useState } from 'react';
import { MiniFactoryStore } from '../../lib/store';
import { BarChart3, DollarSign, ShoppingCart, Package, Users, Warehouse, ChevronRight } from 'lucide-react';
import BalancetePeriodo from './BalancetePeriodo';
import FluxoCaixa from './FluxoCaixa';
import NivelEstoque from './NivelEstoque';
import RankingClientes from './RankingClientes';
import DesempenhoProdutos from './DesempenhoProdutos';
import ConsumoInsumos from './ConsumoInsumos';
import ReceitasPagamento from './ReceitasPagamento';
import MovimentacoesEstoque from './MovimentacoesEstoque';

interface RelatoriosProps {
  store: MiniFactoryStore;
}

const relatorios = [
  {
    id: 'balancete',
    titulo: 'Balancete do Período',
    descricao: 'Resumo financeiro com receitas, despesas e saldo por período',
    icon: DollarSign,
    cor: 'emerald',
    modulo: 'financeiro',
  },
  {
    id: 'fluxo_caixa',
    titulo: 'Fluxo de Caixa',
    descricao: 'Entradas e saídas com saldo acumulado por período',
    icon: BarChart3,
    cor: 'blue',
    modulo: 'financeiro',
  },
  {
    id: 'nivel_estoque',
    titulo: 'Nível de Estoque',
    descricao: 'Posição atual do estoque com status e validades',
    icon: Warehouse,
    cor: 'amber',
    modulo: 'estoque',
  },
  {
    id: 'ranking_clientes',
    titulo: 'Ranking de Clientes',
    descricao: 'Clientes que mais compram por valor e frequência',
    icon: Users,
    cor: 'cyan',
    modulo: 'clientes',
  },
  {
    id: 'desempenho_produtos',
    titulo: 'Desempenho de Produtos',
    descricao: 'Produtos mais vendidos, receita e margem de lucro',
    icon: Package,
    cor: 'rose',
    modulo: 'produtos',
  },
  {
    id: 'consumo_insumos',
    titulo: 'Consumo de Insumos',
    descricao: 'Materiais mais utilizados e custos de produção',
    icon: Package,
    cor: 'teal',
    modulo: 'materiais',
  },
  {
    id: 'receitas_pagamento',
    titulo: 'Receitas por Pagamento',
    descricao: 'Receitas detalhadas por forma de pagamento',
    icon: DollarSign,
    cor: 'violet',
    modulo: 'financeiro',
  },
  {
    id: 'movimentacoes_estoque',
    titulo: 'Movimentações de Estoque',
    descricao: 'Histórico de entradas e saídas de produtos',
    icon: Package,
    cor: 'orange',
    modulo: 'estoque',
  },
];

const corMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
};

const relatorioComponents: Record<string, React.FC<{ store: MiniFactoryStore; isOpen: boolean; onClose: () => void }>> = {
  balancete: BalancetePeriodo,
  fluxo_caixa: FluxoCaixa,
  nivel_estoque: NivelEstoque,
  ranking_clientes: RankingClientes,
  desempenho_produtos: DesempenhoProdutos,
  consumo_insumos: ConsumoInsumos,
  receitas_pagamento: ReceitasPagamento,
  movimentacoes_estoque: MovimentacoesEstoque,
};

export default function Relatorios({ store }: RelatoriosProps) {
  const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null);

  const ComponenteAtivo = relatorioAtivo ? relatorioComponents[relatorioAtivo] : null;
  if (ComponenteAtivo) {
    return <ComponenteAtivo store={store} isOpen={true} onClose={() => setRelatorioAtivo(null)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-amber-800 dark:text-amber-400 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Análise</span>
        <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-amber-100">Relatórios</h1>
        <p className="text-sm text-amber-900/60 dark:text-amber-100/40 mt-1">Análises e indicadores do seu negócio.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {relatorios.map(r => {
          const cor = corMap[r.cor] || corMap.emerald;
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setRelatorioAtivo(r.id)}
              className={`relative text-left p-4 rounded-xl border transition group ${cor.bg} ${cor.border} hover:shadow-md cursor-pointer`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${cor.bg} border ${cor.border}`}>
                <Icon size={20} className={cor.text} />
              </div>
              <h3 className="font-semibold text-sm text-amber-950 dark:text-amber-100 mb-1">{r.titulo}</h3>
              <p className="text-[11px] text-gray-500 dark:text-amber-100/40 leading-relaxed">{r.descricao}</p>
              <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 group-hover:gap-2 transition-all">
                Abrir <ChevronRight size={12} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
