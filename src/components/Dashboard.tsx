import React from 'react';
import { MiniFactoryStore } from '../lib/store';
import { 
  TrendingUp, 
  ShoppingBag, 
  CalendarClock, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Clock,
  User,
  Beef,
  PlusCircle
} from 'lucide-react';

interface DashboardProps {
  store: MiniFactoryStore;
  onNavigate: (tab: string) => void;
  onSetQuickOrder: () => void;
  onSetQuickLot: () => void;
}

export default function Dashboard({ store, onNavigate, onSetQuickOrder, onSetQuickLot }: DashboardProps) {
  // ----------------------------------------------------
  // Live statistics calculations
  // ----------------------------------------------------
  const hojeStr = new Date().toISOString().split('T')[0];
  const hoje = new Date();
  const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Pedidos do dia
  const pedidosHoje = store.pedidos.filter(p => {
    return p.data_pedido.startsWith(hojeStr) || p.data_entrega_prevista.startsWith(hojeStr);
  });

  // Pedidos da semana
  const pedidosSemana = store.pedidos.filter(p => {
    const dataP = new Date(p.data_pedido);
    return dataP >= umaSemanaAtras;
  });

  // Alertas de estoque crítico (matérias-primas abaixo do mínimo)
  const materiaisCriticos = store.materiais.filter(m => m.quantidade_atual < m.quantidade_minima);
  
  // Alertas de estoque crítico produtos acabados
  const produtosCriticos = store.estoqueProdutos.filter(p => p.quantidade_disponivel < p.quantidade_minima);

  // Receita estimada dos pedidos ativos (confirmados, em_producao, pronto)
  const pedidosAtivos = store.pedidos.filter(p => ['confirmado', 'em_producao', 'pronto'].includes(p.status));
  const receitaEstimada = pedidosAtivos.reduce((sum, p) => sum + p.valor_total, 0);

  // Próximas entregas (< 48 horas)
  const proximasEntregas = store.pedidos
    .filter(p => {
      if (['cancelado', 'entregue'].includes(p.status)) return false;
      const dataEntrega = new Date(p.data_entrega_prevista);
      const diffMs = dataEntrega.getTime() - hoje.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours > -4 && diffHours <= 48; // upcoming in 48 hours or late by 4 hours max
    })
    .sort((a,b) => a.data_entrega_prevista.localeCompare(b.data_entrega_prevista));

  // Alertas de validade próxima (< 3 dias)
  const produtosComValidadeProxima = store.estoqueProdutos.filter(ep => {
    if (!ep.data_validade || ep.quantidade_disponivel <= 0) return false;
    const validade = new Date(ep.data_validade);
    const diffMs = validade.getTime() - hoje.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= -1 && diffDays <= 3; // within 3 days or expired yesterday
  }).map(ep => {
    const prod = store.produtos.find(p => p.id === ep.produto_id);
    return {
      ...ep,
      nome: prod?.nome || 'Produto Desconhecido',
      validadeFormatada: ep.data_validade ? new Date(ep.data_validade).toLocaleDateString('pt-BR') : 'N/A'
    };
  });

  // Most ordered products calculations (Módulo 5: Produtos mais pedidos no mês)
  const produtoContagem: { [key: string]: { nome: string; quantidade: number; receita: number } } = {};
  store.itensPedido.forEach(item => {
    // Only count from non-cancelled orders
    const ped = store.pedidos.find(p => p.id === item.pedido_id);
    if (ped && ped.status !== 'cancelado') {
      const prod = store.produtos.find(p => p.id === item.produto_id);
      if (prod) {
        if (!produtoContagem[prod.id]) {
          produtoContagem[prod.id] = { nome: prod.nome, quantidade: 0, receita: 0 };
        }
        produtoContagem[prod.id].quantidade += item.quantidade_solicitada;
        produtoContagem[prod.id].receita += item.quantidade_solicitada * item.preco_unitario;
      }
    }
  });

  const topProdutos = Object.values(produtoContagem)
    .sort((a,b) => b.quantidade - a.quantidade)
    .slice(0, 4);

  // Helper formattings
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden" id="dash-banner">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
          <Sparkles size={250} />
        </div>
        <div className="relative z-10" id="dash-banner-content">
          <span className="bg-amber-700/50 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider font-mono">
            Painel Geral
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-semibold mt-2 tracking-tight">
            Olá, Mini Fábrica! 🥖🍰
          </h1>
          <p className="text-amber-100/90 text-sm mt-1 max-w-xl">
            Acompanhe o ritmo de produção, os insumos na cozinha e as próximas entregas de hoje. Mantenha as mãos na massa com tudo sob controle!
          </p>
          
          <div className="flex flex-wrap gap-2 mt-4" id="quick-actions">
            <button 
              onClick={onSetQuickOrder}
              id="btn-quick-order"
              className="bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1 shadow-sm font-sans"
            >
              <PlusCircle size={14} /> Novo Pedido
            </button>
            <button 
              onClick={onSetQuickLot}
              id="btn-quick-lot"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2 px-4 rounded-xl transition flex items-center gap-1 border border-white/20 font-sans"
            >
              <TrendingUp size={14} /> Concluir Lote de Produção
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" id="stats-grid">
        {/* Receita Estimada */}
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col justify-between" id="stat-revenue">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Faturamento Ativo</span>
            <TrendingUp size={16} className="text-emerald-600 flex-shrink-0" />
          </div>
          <div className="mt-2 overflow-hidden">
            <span className="text-base sm:text-lg md:text-lg lg:text-2xl font-bold font-mono tracking-tight text-amber-950 dark:text-amber-200 block truncate" title={formatCurrency(receitaEstimada)}>
              {formatCurrency(receitaEstimada)}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Pedidos ativos</p>
          </div>
        </div>

        {/* Pedidos Hoje */}
        <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col justify-between" id="stat-orders-today">
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Pedidos de Hoje</span>
            <ShoppingBag size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          </div>
          <div className="mt-2 overflow-hidden">
            <span className="text-base sm:text-lg md:text-lg lg:text-2xl font-bold font-mono text-amber-950 dark:text-amber-200 block truncate">
              {pedidosHoje.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Para hoje</p>
          </div>
        </div>

        {/* Alertas de Insumo */}
        <div 
          onClick={() => onNavigate('materiais')}
          className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition flex flex-col justify-between" 
          id="stat-materials-alert"
        >
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Insumos Críticos</span>
            <AlertTriangle size={16} className={`${materiaisCriticos.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400 dark:text-[#a08f80]'} flex-shrink-0`} />
          </div>
          <div className="mt-2 overflow-hidden">
            <span className={`text-base sm:text-lg md:text-lg lg:text-2xl font-bold font-mono block truncate ${materiaisCriticos.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-950 dark:text-amber-200'}`}>
              {materiaisCriticos.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Abaixo do mínimo</p>
          </div>
        </div>

        {/* Alertas de Produtos */}
        <div 
          onClick={() => onNavigate('estoque')}
          className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition flex flex-col justify-between" 
          id="stat-products-alert"
        >
          <div className="flex items-center justify-between text-amber-900/60 dark:text-amber-400/60 font-medium text-xs">
            <span>Prontos Abaixo Mín.</span>
            <AlertTriangle size={16} className={`${produtosCriticos.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-[#a08f80]'} flex-shrink-0`} />
          </div>
          <div className="mt-2 overflow-hidden">
            <span className={`text-base sm:text-lg md:text-lg lg:text-2xl font-bold font-mono block truncate ${produtosCriticos.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-amber-950 dark:text-amber-200'}`}>
              {produtosCriticos.length}
            </span>
            <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 truncate">Em falta</p>
          </div>
        </div>
      </div>

      {/* Main split dashboard section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-columns-split">
        
        {/* Left Column - Próximas Entregas (48h) */}
        <div className="lg:col-span-2 space-y-6" id="dash-left-col">
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm" id="deliveries-box">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="text-amber-700 dark:text-amber-400" size={20} />
                <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Próximas Entregas (48h)</h2>
              </div>
              <button 
                onClick={() => onNavigate('pedidos')}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 text-xs font-semibold flex items-center gap-1"
                id="btn-goto-orders"
              >
                Ver todos <ChevronRight size={14} />
              </button>
            </div>

            {proximasEntregas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400" id="no-deliveries">
                <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                <p className="text-sm font-medium">Nenhuma entrega agendada nas próximas 48 horas.</p>
                <p className="text-xs text-gray-400">Clique em +Novo Pedido para registrar.</p>
              </div>
            ) : (
              <div className="space-y-3" id="deliveries-list">
                {proximasEntregas.map(p => {
                  const cliente = store.clientes.find(c => c.id === p.cliente_id);
                  const entregaData = new Date(p.data_entrega_prevista);
                  const tempoFaltando = Math.round((entregaData.getTime() - hoje.getTime()) / (1000 * 60 * 60));
                  
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => onNavigate('pedidos')}
                      className="bg-amber-50/30 hover:bg-amber-50/60 dark:bg-amber-950/10 dark:hover:bg-amber-950/20 p-4 rounded-xl border border-amber-100/70 dark:border-amber-950/20 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 cursor-pointer"
                    >
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
                          Valor: <span className="font-mono">{formatCurrency(p.valor_total)}</span> {p.observacoes ? ` | obs: ${p.observacoes}` : ''}
                        </p>
                      </div>

                      <div className="shrink-0 self-start sm:self-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase whitespace-nowrap
                          ${p.status === 'rascunho' ? 'bg-gray-100 text-gray-700' : ''}
                          ${p.status === 'confirmado' ? 'bg-amber-100 text-amber-800' : ''}
                          ${p.status === 'em_producao' ? 'bg-indigo-100 text-indigo-700' : ''}
                          ${p.status === 'pronto' ? 'bg-emerald-100 text-emerald-800' : ''}
                        `}>
                          {p.status === 'rascunho' && 'Rascunho'}
                          {p.status === 'confirmado' && 'Confirmado'}
                          {p.status === 'em_producao' && 'Na Cozinha'}
                          {p.status === 'pronto' && 'Pronto'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Produtos mais vendidos do mês */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm" id="top-products-box">
            <h2 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-4 flex items-center gap-2">
              <TrendingUp className="text-amber-700 dark:text-amber-400" size={20} />
              Produtos Queridinhos (Mais Pedidos)
            </h2>

            {topProdutos.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-amber-100/40 py-4 text-center">Nenhum pedido processado ainda para gerar rankings.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="top-prods-grid">
                {topProdutos.map((tp, idx) => (
                  <div key={idx} className="bg-amber-50/10 dark:bg-[#1c140c] p-3 rounded-xl border border-amber-50 dark:border-[#2a1d10]/40 flex items-center gap-3">
                    <span className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400 font-mono w-6 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-amber-950 dark:text-amber-200 truncate">{tp.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-amber-100/40 font-mono mt-0.5">
                        {tp.quantidade} solicitados | {formatCurrency(tp.receita)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Alertas de Insumo Crítico & Validade */}
        <div className="space-y-6" id="dash-right-col">
          {/* Alertas Críticos de Matérias Primas */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm" id="alerts-raw-box">
            <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              Cozinha Crítica ({materiaisCriticos.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-amber-100/40 mb-4 font-sans">Ingredientes abaixo do estoque mínimo de segurança. Favor repor!</p>

            {materiaisCriticos.length === 0 ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl flex items-center gap-2 text-xs border border-emerald-100/10" id="no-inputs-alerts">
                <CheckCircle2 size={16} className="text-emerald-600 font-bold" />
                <span>Todos os ingredientes estão com níveis adequados de estoque.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar" id="inputs-alerts-list">
                {materiaisCriticos.map(m => (
                  <div key={m.id} className="p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/10 border border-red-100 dark:border-red-950/30 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-red-950 dark:text-red-200 truncate" title={m.nome}>{m.nome}</p>
                      <p className="text-[10px] text-red-700/80 dark:text-red-400 mt-0.5 truncate">Mínimo: {m.quantidade_minima}{m.unidade}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-red-600 dark:text-red-400 font-mono text-sm whitespace-nowrap">{m.quantidade_atual}{m.unidade}</span>
                      <p className="text-[9px] text-red-500 whitespace-nowrap">Repor {Number((m.quantidade_minima - m.quantidade_atual).toFixed(2))}{m.unidade}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas de Validade */}
          <div className="bg-white dark:bg-[#150f09] rounded-2xl p-5 border border-amber-100 dark:border-[#22160b] shadow-sm" id="expiry-box">
            <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Clock className="text-amber-600 dark:text-amber-400" size={18} />
              Validades Próximas ({produtosComValidadeProxima.length})
            </h3>

            {produtosComValidadeProxima.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-[#a08f80] py-3 text-center font-medium">Nenhum lote com validade expirando nos próximos 3 dias.</div>
            ) : (
              <div className="space-y-2" id="expiry-list">
                {produtosComValidadeProxima.map((ep, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/30 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-[#2a1d10]/40 flex items-center justify-between text-xs animate-none">
                    <div>
                      <p className="font-semibold text-amber-950 dark:text-amber-200">{ep.nome}</p>
                      <p className="text-[10px] text-amber-900/60 dark:text-amber-100/40 font-mono mt-0.5 animate-none">Lote: {ep.lote || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-350 border border-red-100 dark:border-[#4c1e13] px-2 py-0.5 rounded text-[10px] font-bold font-sans">
                        Até {ep.validadeFormatada}
                      </span>
                      <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-1 font-mono">{ep.quantidade_disponivel} un rascunhadas</p>
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
