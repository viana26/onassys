import React from 'react';
import { MiniFactoryStore } from '../lib/store';
import {
  TrendingUp, ShoppingBag, CalendarClock, CheckCircle2,
  AlertTriangle, Sparkles, ChevronRight, Clock,
  Beef, PlusCircle, DollarSign,
  ArrowUpCircle, ArrowDownCircle, BarChart3
} from 'lucide-react';
import { normalizarQuantidade } from '../lib/calculos';

interface DashboardProps {
  store: MiniFactoryStore;
  onNavigate: (tab: string) => void;
  onSetQuickOrder: () => void;
  onSetQuickLot: () => void;
  appName?: string;
}

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard({ store, onNavigate, onSetQuickOrder, onSetQuickLot, appName }: DashboardProps) {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().split('T')[0];
  const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  // ---- Financeiro: Fluxo de Caixa do mês ----
  const lancamentosMes = store.lancamentos.filter(l => {
    const d = new Date(l.data_lancamento);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  const receitasMes = lancamentosMes.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const despesasMes = lancamentosMes.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldoMes = receitasMes - despesasMes;

  // ---- A Receber: pedidos entregues com saldo pendente ----
  const aReceber = store.pedidos
    .filter(p => p.status_id === 5)
    .map(p => {
      const recebido = store.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
      const pendente = p.valor_total - recebido;
      return { pedido: p, pendente, cliente: store.clientes.find(c => c.id === p.cliente_id) };
    })
    .filter(x => x.pendente > 0)
    .sort((a, b) => b.pendente - a.pendente);

  // ---- O Que Produzir Hoje ----
  const pedidosParaProduzir = store.pedidos.filter(p => p.status_id === 2);
  const produtosViaveis = pedidosParaProduzir.flatMap(p => {
    const itens = store.itensPedido.filter(i => i.pedido_id === p.id);
    return itens.map(item => {
      const prod = store.produtos.find(pr => pr.id === item.produto_id);
      const fichas = store.fichas.filter(f => f.produto_id === item.produto_id);
      const faltaMaterial = fichas.some(f => {
        const mat = store.materiais.find(m => m.id === f.material_id);
        if (!mat) return true;
        const needed = normalizarQuantidade(f.quantidade_necessaria * item.quantidade_solicitada, f.unidade_id, mat.unidade_id, store.unidades);
        return mat.quantidade_atual < needed;
      });
      return { produto: prod, pedido: p, quantidade: item.quantidade_solicitada, viavel: !faltaMaterial };
    });
  }).filter(p => p.produto);

  const viaveis = produtosViaveis.filter(p => p.viavel);
  const inviaveis = produtosViaveis.filter(p => !p.viavel);
  const pedidosProntosParaCozinha = [...new Set(viaveis.map(p => p.pedido!.id))];

  // ---- Custo x Receita por Produto ----
  const custoReceita = store.produtos.map(prod => {
    const fichas = store.fichas.filter(f => f.produto_id === prod.id);
    const custoInsumos = fichas.reduce((s, f) => {
      const mat = store.materiais.find(m => m.id === f.material_id);
      if (!mat) return s;
      return s + normalizarQuantidade(f.quantidade_necessaria, f.unidade_id, mat.unidade_id, store.unidades) * mat.custo_unitario;
    }, 0);
    const itensVendidos = store.itensPedido.filter(i => {
      const ped = store.pedidos.find(p => p.id === i.pedido_id);
      return i.produto_id === prod.id && ped && ped.status_id !== 6;
    });
    const qtdVendida = itensVendidos.reduce((s, i) => s + i.quantidade_solicitada, 0);
    const receitaTotal = itensVendidos.reduce((s, i) => s + i.quantidade_solicitada * i.preco_unitario, 0);
    const receitaMedia = qtdVendida > 0 ? receitaTotal / qtdVendida : prod.preco_venda || 0;
    const margem = receitaMedia > 0 ? ((receitaMedia - custoInsumos) / receitaMedia * 100) : 0;
    return { produto: prod, custoInsumos, receitaMedia, margem, qtdVendida };
  }).filter(c => c.qtdVendida > 0 || c.custoInsumos > 0)
    .sort((a, b) => (b.receitaMedia - b.custoInsumos) - (a.receitaMedia - a.custoInsumos))
    .slice(0, 6);

  // ---- Existing metrics ----
  const pedidosHoje = store.pedidos.filter(p => {
    return p.data_pedido.startsWith(hojeStr) || p.data_entrega_prevista.startsWith(hojeStr);
  });
  const pedidosSemana = store.pedidos.filter(p => {
    const dataP = new Date(p.data_pedido);
    return dataP >= umaSemanaAtras;
  });
  const materiaisCriticos = store.materiais.filter(m => m.quantidade_atual < m.quantidade_minima);
  const produtosCriticos = store.estoqueProdutos.filter(p => p.quantidade_disponivel < p.quantidade_minima);
  const pedidosAtivos = store.pedidos.filter(p => [2, 3, 4].includes(p.status_id));
  const receitaEstimada = pedidosAtivos.reduce((sum, p) => sum + p.valor_total, 0);

  const proximasEntregas = store.pedidos
    .filter(p => {
      if ([5, 6].includes(p.status_id)) return false;
      const dataEntrega = new Date(p.data_entrega_prevista);
      const diffMs = dataEntrega.getTime() - hoje.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > -4 && diffHours <= 48;
    })
    .sort((a,b) => a.data_entrega_prevista.localeCompare(b.data_entrega_prevista));

  const produtosComValidadeProxima = store.estoqueProdutos.filter(ep => {
    if (!ep.data_validade || ep.quantidade_disponivel <= 0) return false;
    const validade = new Date(ep.data_validade);
    const diffMs = validade.getTime() - hoje.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 3;
  }).map(ep => {
    const prod = store.produtos.find(p => p.id === ep.produto_id);
    return {
      ...ep,
      nome: prod?.nome || 'Desconhecido',
      validadeFormatada: ep.data_validade ? new Date(ep.data_validade).toLocaleDateString('pt-BR') : 'N/A'
    };
  });

  return (
    <div className="space-y-6" id="dashboard-tab" data-help="dashboard">
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden" id="dash-banner">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Sparkles size={250} />
        </div>
        <div className="relative z-10" id="dash-banner-content">
          <span className="bg-amber-700/50 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Painel Geral
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-semibold mt-2 tracking-tight">
            Olá, {appName || 'Mini Fábrica'}! 🥖🍰
          </h1>
          <p className="text-amber-100/90 text-sm mt-1 max-w-xl">
            Acompanhe o ritmo de produção, os insumos na cozinha e as próximas entregas de hoje.
          </p>
          <div className="flex flex-wrap gap-2 mt-4" id="quick-actions">
            <button onClick={onSetQuickOrder}
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1 shadow-sm font-sans">
              <PlusCircle size={14} /> Novo Pedido
            </button>
            <button onClick={onSetQuickLot}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1 border border-white/20 font-sans">
              <TrendingUp size={14} /> Concluir Lote de Produção
            </button>
          </div>
        </div>
      </div>

      {/* === FLUXO DE CAIXA REAL === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-medium text-xs">
            <span>Receitas do Mês</span>
            <ArrowUpCircle size={16} />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg lg:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {formatCurrency(receitasMes)}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-red-200 dark:border-red-900/40 shadow-sm">
          <div className="flex items-center justify-between text-red-700 dark:text-red-400 font-medium text-xs">
            <span>Despesas do Mês</span>
            <ArrowDownCircle size={16} />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg lg:text-2xl font-bold font-mono text-red-600 dark:text-red-400 block truncate">
              {formatCurrency(despesasMes)}
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-medium text-xs">
            <span>Saldo do Mês</span>
            <DollarSign size={16} />
          </div>
          <div className="mt-2">
            <span className={`text-base sm:text-lg lg:text-2xl font-bold font-mono block truncate ${saldoMes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(saldoMes)}
            </span>
          </div>
        </div>
        <div onClick={() => onNavigate('financeiro')}
          className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-medium text-xs">
            <span>A Receber {aReceber.length > 0 && <span className="ml-1 text-red-500 font-bold">({aReceber.length})</span>}</span>
            <Clock size={16} />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg lg:text-2xl font-bold font-mono text-amber-950 dark:text-amber-200 block truncate">
              {formatCurrency(aReceber.reduce((s, x) => s + x.pendente, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* === OPERACIONAL === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Faturamento Ativo</span>
            <TrendingUp size={16} className="text-emerald-600 flex-shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg lg:text-2xl font-bold font-mono text-amber-950 dark:text-amber-200 block truncate">
              {formatCurrency(receitaEstimada)}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Pedidos ativos</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Pedidos de Hoje</span>
            <ShoppingBag size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg lg:text-2xl font-bold font-mono text-amber-950 dark:text-amber-200 block truncate">
              {pedidosHoje.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Para hoje</p>
          </div>
        </div>
        <div onClick={() => onNavigate('materiais')}
          className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Insumos Críticos</span>
            <AlertTriangle size={16} className={`${materiaisCriticos.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400 dark:text-[#a08f80]'} flex-shrink-0`} />
          </div>
          <div className="mt-2">
            <span className={`text-base sm:text-lg lg:text-2xl font-bold font-mono block truncate ${materiaisCriticos.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-950 dark:text-amber-200'}`}>
              {materiaisCriticos.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Abaixo do mínimo</p>
          </div>
        </div>
        <div onClick={() => onNavigate('estoque')}
          className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Prontos Abaixo Mín.</span>
            <AlertTriangle size={16} className={`${produtosCriticos.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-[#a08f80]'} flex-shrink-0`} />
          </div>
          <div className="mt-2">
            <span className={`text-base sm:text-lg lg:text-2xl font-bold font-mono block truncate ${produtosCriticos.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-amber-950 dark:text-amber-200'}`}>
              {produtosCriticos.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Em falta</p>
          </div>
        </div>
      </div>

      {/* === MAIN SPLIT === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">

          {/* A RECEBER */}
          {aReceber.length > 0 && (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-red-500" size={20} />
                  <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">A Receber</h2>
                  <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">{aReceber.length}</span>
                </div>
                <button onClick={() => onNavigate('financeiro')}
                  className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-xs font-semibold flex items-center gap-1">
                  Ver todos <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-2">
                {aReceber.slice(0, 5).map(x => (
                  <div key={x.pedido.id} onClick={() => onNavigate('pedidos')}
                    className="flex items-center justify-between p-3 bg-red-50/40 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-950/30 cursor-pointer hover:bg-red-50/80 dark:hover:bg-red-950/20 transition">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-amber-950 dark:text-amber-200 truncate">{x.cliente?.nome || 'Cliente'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-amber-100/40 font-mono">#{x.pedido.id.slice(-6).toUpperCase()} — {new Date(x.pedido.data_entrega_prevista).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className="font-bold font-mono text-red-600 dark:text-red-400 text-sm whitespace-nowrap">{formatCurrency(x.pendente)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PRÓXIMAS ENTREGAS */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="text-amber-700 dark:text-amber-400" size={20} />
                <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Próximas Entregas (48h)</h2>
              </div>
              <button onClick={() => onNavigate('pedidos')}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-xs font-semibold flex items-center gap-1">
                Ver todos <ChevronRight size={14} />
              </button>
            </div>

            {proximasEntregas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                <p className="text-sm font-medium">Nenhuma entrega agendada nas próximas 48 horas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proximasEntregas.map(p => {
                  const cliente = store.clientes.find(c => c.id === p.cliente_id);
                  const entregaData = new Date(p.data_entrega_prevista);
                  const tempoFaltando = Math.round((entregaData.getTime() - hoje.getTime()) / (1000 * 60 * 60));
                  return (
                    <div key={p.id} onClick={() => onNavigate('pedidos')}
                      className="bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 p-4 rounded-xl border border-amber-100/70 dark:border-amber-950/20 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-amber-950 dark:text-amber-200 font-display truncate max-w-[200px]" title={cliente?.nome}>
                            {cliente?.nome || 'Cliente não encontrado'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-amber-100/40 font-mono">
                            #{p.id.substring(4).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-amber-900/70 dark:text-amber-100/60">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={12} />
                            {entregaData.toLocaleDateString('pt-BR')} às {entregaData.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono tracking-wider uppercase
                            ${tempoFaltando < 24 && tempoFaltando >= 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300'}
                          `}>
                            {tempoFaltando < 0 ? 'Atrasado' : tempoFaltando === 0 ? 'Agora' : `Em ${tempoFaltando}h`}
                          </span>
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-300 font-medium font-sans truncate">
                          {formatCurrency(p.valor_total)} {p.observacoes ? ` | ${p.observacoes}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 self-start sm:self-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase whitespace-nowrap
                          ${p.status_id === 1 ? 'bg-gray-100 text-gray-700' : ''}
                          ${p.status_id === 2 ? 'bg-amber-100 text-amber-800' : ''}
                          ${p.status_id === 3 ? 'bg-indigo-100 text-indigo-700' : ''}
                          ${p.status_id === 4 ? 'bg-emerald-100 text-emerald-800' : ''}
                        `}>
                          {store.statusNome(p.status_id)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUSTO x RECEITA */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-amber-700 dark:text-amber-400" size={20} />
              <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Custo x Receita por Produto</h2>
            </div>
            {custoReceita.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-amber-100/40 py-4 text-center">Nenhum produto vendido ainda.</p>
            ) : (
              <div className="space-y-2">
                {custoReceita.map((cr, idx) => (
                  <div key={cr.produto.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-50/10 dark:bg-[#1c140c] border border-amber-50 dark:border-[#2a1d10]/40">
                    <span className="font-display font-bold text-lg text-amber-600 dark:text-amber-400 font-mono w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-amber-950 dark:text-amber-200 truncate">{cr.produto.nome}</p>
                      <p className="text-[10px] text-gray-500 dark:text-amber-100/40 font-mono">
                        Custo: {formatCurrency(cr.custoInsumos)} | Venda: {formatCurrency(cr.receitaMedia)} | {cr.qtdVendida} vendidos
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-bold font-mono text-xs ${cr.margem >= 30 ? 'text-emerald-600 dark:text-emerald-400' : cr.margem >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {cr.margem >= 0 ? '+' : ''}{cr.margem.toFixed(0)}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${cr.margem >= 30 ? 'bg-emerald-500' : cr.margem >= 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(Math.max(cr.margem, 0), 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* O QUE PRODUZIR HOJE */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
            <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Beef className="text-amber-600" size={18} />
              O Que Produzir Hoje
              {pedidosProntosParaCozinha.length > 0 && (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">{pedidosProntosParaCozinha.length} prontos</span>
              )}
            </h3>

            {viaveis.length === 0 && inviaveis.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-[#a08f80] py-3 text-center">Nenhum pedido confirmado aguardando produção.</div>
            ) : (
              <div className="space-y-3">
                {viaveis.slice(0, 6).map((v, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200 truncate">{v.produto?.nome}</p>
                      <p className="text-[9px] text-emerald-700/60 dark:text-emerald-400/60 mt-0.5">{v.quantidade}x p/ {v.pedido && store.clientes.find(c => c.id === v.pedido.cliente_id)?.nome}</p>
                    </div>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">✓ Insumos OK</span>
                  </div>
                ))}
                {inviaveis.slice(0, 3).map((iv, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-red-50/40 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-200 truncate">{iv.produto?.nome}</p>
                      <p className="text-[9px] text-red-600/60 dark:text-red-400/60 mt-0.5">{iv.quantidade}x — falta insumo</p>
                    </div>
                    <button onClick={() => onNavigate('materiais')}
                      className="text-[9px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                      Comprar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* INSUMOS CRÍTICOS */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
            <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-3 flex items-center gap-2">
              <AlertTriangle className={`${materiaisCriticos.length > 0 ? 'text-red-500' : 'text-gray-400'}`} size={18} />
              Cozinha Crítica ({materiaisCriticos.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-amber-100/40 mb-4 font-sans">Ingredientes abaixo do estoque mínimo de segurança.</p>

            {materiaisCriticos.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs border border-emerald-100/10">
                <CheckCircle2 size={16} className="text-emerald-600 font-bold" />
                <span>Todos os ingredientes estão com níveis adequados.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {materiaisCriticos.map(m => (
                  <div key={m.id} className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/10 border border-red-100 dark:border-red-950/30 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-red-950 dark:text-red-200 truncate" title={m.nome}>{m.nome}</p>
                      <p className="text-[10px] text-red-700/80 dark:text-red-400 mt-0.5 truncate">Mín: {m.quantidade_minima}{store.unidadeSigla(m.unidade_id)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-red-600 dark:text-red-400 font-mono text-sm whitespace-nowrap">{m.quantidade_atual}{store.unidadeSigla(m.unidade_id)}</span>
                      <p className="text-[9px] text-red-500 whitespace-nowrap">Repor {(m.quantidade_minima - m.quantidade_atual).toFixed(2)}{store.unidadeSigla(m.unidade_id)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VALIDADES */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm">
            <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Clock className="text-amber-600 dark:text-amber-400" size={18} />
              Validades Próximas ({produtosComValidadeProxima.length})
            </h3>
            {produtosComValidadeProxima.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-[#a08f80] py-3 text-center font-medium">Nenhum lote com validade expirando nos próximos 3 dias.</div>
            ) : (
              <div className="space-y-2">
                {produtosComValidadeProxima.map((ep, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/30 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-[#2a1d10]/40 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-amber-950 dark:text-amber-200">{ep.nome}</p>
                      <p className="text-[10px] text-amber-900/60 dark:text-amber-100/40 font-mono mt-0.5">Lote: {ep.lote || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-350 border border-red-100 dark:border-[#4c1e13] px-2 py-0.5 rounded text-[10px] font-bold font-sans">
                        Até {ep.validadeFormatada}
                      </span>
                      <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 font-mono">{ep.quantidade_disponivel} un</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
