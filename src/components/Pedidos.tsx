import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Pedido, Cliente } from '../types';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  KanbanSquare, 
  ClipboardList, 
  PlusCircle, 
  X,
  DollarSign
} from 'lucide-react';
import { analisarEstoqueParaPedido } from '../lib/calculos';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PedidosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
  // Trigger order modal directly (used by quick dashboard buttons too)
  forceOpenNewOrderRef?: { trigger: () => void };
  onNavigateToCaixa?: (pedidoId?: string) => void;
}

export default function Pedidos({ store, onUpdate, forceOpenNewOrderRef, onNavigateToCaixa }: PedidosProps) {
  const [activeTab, setActiveTab] = useState<'kanban' | 'carga' | 'lista'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Kanban columns active selection on mobile (Rule: display 1 column at a time on mobile with swipe navigation tabs)
  const [mobileKanbanColumn, setMobileKanbanColumn] = useState<number>(2);

  // Form builder state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [statusId, setStatusId] = useState<number>(2);
  const [itensPedido, setItensPedido] = useState<{ produto_id: string; quantidade_solicitada: number; preco_unitario: number; observacao?: string }[]>([]);

  // Selected Order detail popup state
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  
  // Edit mode
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  
  // Live ingredient depletion analyzer inside Order Creator
  const [analiseResultado, setAnaliseResultado] = useState<ReturnType<typeof analisarEstoqueParaPedido> | null>(null);



  // Drag and drop states for Kanban columns
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Quick order trigger handler exposes
  if (forceOpenNewOrderRef) {
    forceOpenNewOrderRef.trigger = () => {
      handleOpenNewOrder();
    };
  }

  const handleOpenNewOrder = () => {
    setEditingPedidoId(null);
    setIsFormOpen(true);
    setClienteId(store.clientes[0]?.id || '');
    // sugiere fecha entrega: mañana a las 16h
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dateFormatted = amanha.toISOString().split('T')[0] + 'T16:00';
    setDataEntrega(dateFormatted);
    setObservacoes('');
    setStatusId(2);
    // Adiciona primeiramente uma coxinha
    setItensPedido([{ produto_id: store.produtos[0]?.id || '', quantidade_solicitada: 10, preco_unitario: 15.00 }]);
    setAnaliseResultado(null);
  };

  const handleOpenEditOrder = (pedidoId: string) => {
    const pedido = store.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    setEditingPedidoId(pedidoId);
    setClienteId(pedido.cliente_id);
    setDataEntrega(pedido.data_entrega_prevista);
    setObservacoes(pedido.observacoes || '');
    setStatusId(pedido.status_id);

    const itens = store.itensPedido.filter(it => it.pedido_id === pedidoId);
    setItensPedido(itens.map(it => ({
      produto_id: it.produto_id,
      quantidade_solicitada: it.quantidade_solicitada,
      preco_unitario: it.preco_unitario,
      observacao: it.observacao
    })));

    setAnaliseResultado(null);
    setSelectedPedidoId(null);
    setIsFormOpen(true);
  };

  const handleAddItemRow = () => {
    const prod = store.produtos[0];
    if (!prod) return;
    setItensPedido([
      ...itensPedido, 
      { produto_id: prod.id, quantidade_solicitada: 5, preco_unitario: 15.00 }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItensPedido(itensPedido.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx: number, fields: Partial<typeof itensPedido[0]>) => {
    const next = [...itensPedido];
    next[idx] = { ...next[idx], ...fields };

    // Auto align unit sales price according to catalog
    if (fields.produto_id) {
      const selectedProd = store.produtos.find(p => p.id === fields.produto_id);
      if (selectedProd) {
        // Suggested pricing system defaults
        let precoSugerido = 15.00;
        const catBolo = store.categorias.find(c => c.nome === 'bolo')?.id;
        const catSalgado = store.categorias.find(c => c.nome === 'salgado')?.id;
        if (selectedProd.categoria_id === catBolo) precoSugerido = 80.00;
        if (selectedProd.categoria_id === catSalgado && selectedProd.unidade_producao_id === 5) precoSugerido = 2.50;
        next[idx].preco_unitario = precoSugerido;
      }
    }

    setItensPedido(next);
  };

  // Live validation trigger inside order wizard
  const triggerLiveStockValidation = () => {
    const formatados = itensPedido.map(it => {
      const p = store.produtos.find(prod => prod.id === it.produto_id);
      return {
        produtoId: it.produto_id,
        produtoNome: p?.nome || 'N/A',
        quantidadeSolicitada: Number(it.quantidade_solicitada)
      };
    });

    const res = analisarEstoqueParaPedido(formatados, store.estoqueProdutos, store.fichas, store.materiais, store.unidades);
    setAnaliseResultado(res);
  };

  const handleSaveOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      alert('Por favor cadastre ou selecione um cliente.');
      return;
    }
    if (itensPedido.length === 0) {
      alert('Adicione pelo menos 1 produto no pedido.');
      return;
    }

    if (editingPedidoId) {
      // Update existing order
      store.updatePedido(editingPedidoId, {
        cliente_id: clienteId,
        status_id: statusId,
        data_entrega_prevista: dataEntrega,
        observacoes: observacoes,
        criado_by: 'Cozinha'
      });

      const existingItens = store.itensPedido.filter(it => it.pedido_id === editingPedidoId);
      const newItemKeys = itensPedido.map(item => `${item.produto_id}_${item.preco_unitario}_${item.observacao || ''}`);

      // Remove items that are no longer in the list
      existingItens.forEach(existingItem => {
        const key = `${existingItem.produto_id}_${existingItem.preco_unitario}_${existingItem.observacao || ''}`;
        if (!newItemKeys.includes(key)) {
          store.deleteItemPedido(existingItem.id);
        }
      });

      // Add or update items
      itensPedido.forEach((item, idx) => {
        const existing = existingItens[idx];
        if (existing) {
          store.updateItemPedido(existing.id, {
            produto_id: item.produto_id,
            quantidade_solicitada: item.quantidade_solicitada,
            preco_unitario: item.preco_unitario,
            observacao: item.observacao
          });
        } else {
          store.addItemPedido({
            pedido_id: editingPedidoId,
            produto_id: item.produto_id,
            quantidade_solicitada: item.quantidade_solicitada,
            quantidade_produzida: 0,
            preco_unitario: item.preco_unitario,
            observacao: item.observacao
          });
        }
      });

      setEditingPedidoId(null);
      setIsFormOpen(false);
      onUpdate();
      return;
    }

    // Save order
    const savedPedido = store.addPedido({
      cliente_id: clienteId,
      status_id: statusId,
      data_entrega_prevista: dataEntrega,
      observacoes: observacoes,
      criado_by: 'Cozinha'
    });

    Promise.resolve(savedPedido).then(pedido => {
      itensPedido.forEach(item => {
        store.addItemPedido({
          pedido_id: pedido.id,
          produto_id: item.produto_id,
          quantidade_solicitada: item.quantidade_solicitada,
          quantidade_produzida: 0,
          preco_unitario: item.preco_unitario,
          observacao: item.observacao
        });
      });
    });

    setIsFormOpen(false);
    onUpdate();
  };

  const handleTransitionStatus = async (pedId: string, novoSt: number) => {
    const result = await store.updatePedidoStatus(pedId, novoSt);
    if (!result.success) {
      alert(result.error);
    } else {
      onUpdate();
    }
  };

  // Helpers
  const getClienteName = (cid: string) => {
    return store.clientes.find(c => c.id === cid)?.nome || 'Cliente Desconhecido';
  };

  const getProdutoName = (pid: string) => {
    return store.produtos.find(p => p.id === pid)?.nome || 'N/A';
  };

  

  // Filters
  const filteredPedidos = store.pedidos.filter(p => {
    const cliName = getClienteName(p.cliente_id).toLowerCase();
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = cliName.includes(searchLow) || p.id.includes(searchLow);
    return matchesSearch;
  });

  // Days of delivery workloads (Workload planner scheduler weekly calculations)
  const getWorkloadByDay = () => {
    // Collect active production delivery goals (confirmado, em_producao, pronto) grouped by weekday
    const daysData: { [dateStr: string]: { date: Date; pedidos: Pedido[]; totalUnidadesSalgados: number; totalUnidadesDoces: number; totalUnidadesBolos: number } } = {};
    
    // Generate next 7 days list
    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() + i);
      const str = dt.toISOString().split('T')[0];
      daysData[str] = {
        date: dt,
        pedidos: [],
        totalUnidadesSalgados: 0,
        totalUnidadesDoces: 0,
        totalUnidadesBolos: 0
      };
    }

    store.pedidos.forEach(p => {
      if ([5, 6].includes(p.status_id)) return;
      const str = p.data_entrega_prevista.split('T')[0];
      if (daysData[str]) {
        daysData[str].pedidos.push(p);

        // Sum quantities
        const itens = store.itensPedido.filter(it => it.pedido_id === p.id);
        itens.forEach(it => {
          const prod = store.produtos.find(prd => prd.id === it.produto_id);
          if (prod) {
            const catSalgado = store.categorias.find(c => c.nome === 'salgado')?.id;
            const catDoce = store.categorias.find(c => c.nome === 'doce')?.id;
            const catBolo = store.categorias.find(c => c.nome === 'bolo')?.id;
            if (prod.categoria_id === catSalgado) daysData[str].totalUnidadesSalgados += it.quantidade_solicitada;
            if (prod.categoria_id === catDoce) daysData[str].totalUnidadesDoces += it.quantidade_solicitada;
            if (prod.categoria_id === catBolo) daysData[str].totalUnidadesBolos += it.quantidade_solicitada;
          }
        });
      }
    });

    return Object.values(daysData);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-amber-800 dark:text-amber-400 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Pedidos</span>
          <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-amber-100">Controle de Produção e Pedidos</h1>
          <p className="text-sm text-amber-900/60 dark:text-amber-100/40 mt-1">Monitore rascunhos, confirme pedidos, verifique insumos deficientes e trace o Kanban semanal.</p>
        </div>

        <button 
          onClick={handleOpenNewOrder}
          className="bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-700 shadow-sm text-white text-xs font-semibold font-sans py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center font-medium"
        >
          <PlusCircle size={16} /> Novo Pedido de Cliente
        </button>
      </div>

      {/* Segment tabs */}
      <div className="flex border-b border-amber-100 dark:border-[#22160b] gap-4" id="orders-tabs">
        <button 
          onClick={() => setActiveTab('kanban')}
          className={`pb-2.5 text-xs font-semibold uppercase tracking-wider font-sans transition flex items-center gap-1
            ${activeTab === 'kanban' ? 'border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-bold' : 'text-gray-500 dark:text-[#a08f80]'}
          `}
        >
          <KanbanSquare size={16} /> Quadro Kanban
        </button>
        <button 
          onClick={() => setActiveTab('carga')}
          className={`pb-2.5 text-xs font-semibold uppercase tracking-wider font-sans transition flex items-center gap-1
            ${activeTab === 'carga' ? 'border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-bold' : 'text-gray-500 dark:text-[#a08f80]'}
          `}
        >
          <Calendar size={16} /> Carga de Trabalho (Planejador)
        </button>
        <button 
          onClick={() => setActiveTab('lista')}
          className={`pb-2.5 text-xs font-semibold uppercase tracking-wider font-sans transition flex items-center gap-1
            ${activeTab === 'lista' ? 'border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-bold' : 'text-gray-500 dark:text-[#a08f80]'}
          `}
        >
          <ClipboardList size={16} /> Lista Geral de Pedidos
        </button>
      </div>

      {/* ---------------------------------------------------------------------------- */}
      {/* VIEW 1: KANBAN BOARD */}
      {/* ---------------------------------------------------------------------------- */}
      {activeTab === 'kanban' && (
        <div className="space-y-4" id="kanban-view">
          
          {/* Mobile column controller tabs (Rule: 1 column at a time on mobile) */}
          <div className="flex sm:hidden overflow-x-auto gap-1.5 border border-amber-100 dark:border-[#22160b] p-1 bg-amber-50/20 dark:bg-[#1a1107]/50 rounded-xl no-scrollbar font-sans text-[10px] font-bold">
            {[
              { status: 2, label: 'Aguardando ⏳' },
              { status: 3, label: 'Cozinha 🥘' },
              { status: 4, label: 'Pronto 📦' },
              { status: 5, label: 'Entregue 🚚' }
            ].map(col => (
              <button
                key={col.status}
                onClick={() => setMobileKanbanColumn(col.status)}
                className={`flex-1 text-center py-2 px-1 rounded-lg transition-all ${
                  mobileKanbanColumn === col.status 
                    ? 'bg-amber-800 dark:bg-amber-700 text-white' 
                    : 'text-gray-500 dark:text-amber-200/50'
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>
             {/* Kanban columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kanban-columns-container">
            {/* Compile Columns list */}
            {[
              { id: 2, title: 'Aguardando Produção', color: 'bg-amber-50/45 dark:bg-[#1a1107]/40 border-amber-100 dark:border-[#382613]/55', text: 'text-amber-950 dark:text-amber-200', badge: 'bg-amber-200 dark:bg-amber-950/80 dark:text-amber-200' },
              { id: 3, title: 'Em Produção (Cozinha)', color: 'bg-indigo-50/20 dark:bg-[#111124]/30 border-indigo-100 dark:border-[#22224c]/40', text: 'text-indigo-900 dark:text-indigo-300', badge: 'bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200' },
              { id: 4, title: 'Pronto p/ Entrega', color: 'bg-emerald-50/20 dark:bg-[#071a10]/30 border-emerald-100 dark:border-[#133c24]/40', text: 'text-emerald-900 dark:text-emerald-305', badge: 'bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' },
              { id: 5, title: 'Entregues Recentes', color: 'bg-gray-50/20 dark:bg-[#111111]/30 border-gray-100 dark:border-[#222222]/40', text: 'text-gray-650 dark:text-gray-300', badge: 'bg-gray-200 dark:bg-gray-800 dark:text-gray-300' }
            ].map(col => {
              const ordersInCol = filteredPedidos.filter(p => p.status_id === col.id);
              
              // Hide other columns on mobile if not active
              const isActiveOnMobile = mobileKanbanColumn === col.id;
              const isDragOver = dragOverColumn === col.id;
              
              const columnClass = `rounded-2xl border p-4 flex flex-col gap-3 min-h-[50vh] transition-all duration-200 ${col.color} 
                ${isActiveOnMobile ? 'block' : 'hidden sm:flex'}
                ${isDragOver ? 'ring-2 ring-amber-500 ring-dashed scale-[1.01] bg-amber-50/90 dark:bg-[#201306]/90 border-amber-300 dark:border-amber-700' : ''}`;

              return (
                <div 
                  key={col.id} 
                  className={columnClass}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverColumn !== col.id) {
                      setDragOverColumn(col.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverColumn(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const orderId = e.dataTransfer.getData("text/plain") || draggedOrderId;
                    if (orderId) {
                      handleTransitionStatus(orderId, col.id);
                    }
                    setDraggedOrderId(null);
                    setDragOverColumn(null);
                  }}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-[#22160b]/40">
                    <span className={`font-display font-bold text-sm ${col.text}`}>{col.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono text-gray-800 dark:text-gray-200 ${col.badge}`}>
                      {ordersInCol.length}
                    </span>
                  </div>

                  {/* Orders cards rendering */}
                  {ordersInCol.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-400 font-sans text-xs">
                      <span>Sem pedidos aqui.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto max-h-[60vh] no-scrollbar">
                      {ordersInCol.map(p => {
                        const cli = store.clientes.find(c => c.id === p.cliente_id);
                        const itens = store.itensPedido.filter(it => it.pedido_id === p.id);
                        const estEntrega = new Date(p.data_entrega_prevista);
                        const horasFaltando = Math.round((estEntrega.getTime() - new Date().getTime()) / (1000 * 60 * 60));
                        const isUrgente = horasFaltando > -4 && horasFaltando <= 24;
                        const isBeingDragged = draggedOrderId === p.id;

                        return (
                          <div 
                            key={p.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", p.id);
                              setDraggedOrderId(p.id);
                              // Delayed class toggle to avoid making the drag image itself translucent
                              setTimeout(() => {
                                const cardEl = document.getElementById(`kanban-card-${p.id}`);
                                if (cardEl) {
                                  cardEl.classList.add("opacity-40", "border-dashed");
                                }
                              }, 0);
                            }}
                            onDragEnd={() => {
                              setDraggedOrderId(null);
                              const cardEl = document.getElementById(`kanban-card-${p.id}`);
                              if (cardEl) {
                                cardEl.classList.remove("opacity-40", "border-dashed");
                              }
                            }}
                            id={`kanban-card-${p.id}`}
                            onClick={() => setSelectedPedidoId(p.id)}
                            className={`bg-white dark:bg-[#1a1107] p-3.5 rounded-xl border border-amber-100 dark:border-[#2f1f0e] shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-400 dark:hover:border-amber-700 hover:shadow transition space-y-3.5 relative
                              ${isUrgente ? 'ring-2 ring-red-500/20' : ''}
                              ${isBeingDragged ? 'opacity-40 border-dashed scale-95' : ''}
                            `}
                          >
                            {/* Urgent ribbon if delivery < 24h */}
                            {isUrgente && (
                              <span className="absolute top-2 right-2 bg-red-100 dark:bg-red-950 text-red-750 dark:text-red-350 animate-pulse text-[8px] font-bold px-1.5 py-0.5 rounded uppercase font-sans">
                                🚨 Urgente ({horasFaltando}h)
                              </span>
                            )}

                            <div>
                              <p className="font-semibold text-xs text-amber-950 dark:text-amber-100 font-display line-clamp-1">{cli?.nome}</p>
                              <div className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-amber-100/30 font-mono mt-1">
                                <span>#{p.id.substring(4).toUpperCase()}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5 text-amber-900/70 dark:text-amber-300/70">
                                  <Clock size={9} /> {estEntrega.toLocaleDateString('pt-BR')} {estEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {/* Items condensed representation */}
                            <div className="space-y-1">
                              {itens.map((it, itIdx) => (
                                <div key={itIdx} className="text-[10px] text-gray-600 dark:text-amber-100/50 truncate flex items-center justify-between">
                                  <span>{it.quantidade_solicitada}x {getProdutoName(it.produto_id)}</span>
                                </div>
                              ))}
                            </div>

                            {/* Card footer details */}
                            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-amber-50 dark:border-[#2f1f0e] gap-1.5">
                              <span className="font-bold text-[10px] sm:text-[11px] text-amber-950 dark:text-amber-200 font-mono shrink-0">{formatCurrency(p.valor_total)}</span>
                              
                              {/* Fast click status controllers */}
                              <div className="flex items-center gap-1 shrink-0">
                                {p.status_id === 2 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTransitionStatus(p.id, 3);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[9px] py-1 px-1.5 sm:px-2 rounded whitespace-nowrap"
                                  >
                                    Cozinha
                                  </button>
                                )}
                                {p.status_id === 3 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTransitionStatus(p.id, 4);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] py-1 px-1.5 sm:px-2 rounded animate-pulse whitespace-nowrap"
                                  >
                                    Pronto!
                                  </button>
                                )}
                                {p.status_id === 4 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTransitionStatus(p.id, 5);
                                    }}
                                    className="bg-gray-800 hover:bg-gray-950 text-white font-bold text-[9px] py-1 px-1.5 sm:px-2 rounded whitespace-nowrap"
                                  >
                                    Entregar 🚚
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* VIEW 2: CARGA DE TRABALHO CALENDAR */}
      {/* ---------------------------------------------------------------------------- */}
      {activeTab === 'carga' && (
        <div className="space-y-6" id="workload-planning-view">
          <div>
            <h3 className="font-semibold text-base font-display text-amber-950">Planejamento de Assamento Semanal</h3>
            <p className="text-xs text-amber-900/60 mt-0.5">Soma diária de salgados, doces e bolos agendados para ajudar a organizar a preparação de massas e recheios em lote.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3 text-xs" id="workload-cards-grid">
            {getWorkloadByDay().map((day, idx) => {
              const diaNome = day.date.toLocaleDateString('pt-BR', { weekday: 'short' });
              const diaNumero = day.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              const isHoje = day.date.toDateString() === new Date().toDateString();

              return (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 shadow-sm pb-5
                    ${isHoje ? 'border-amber-500 bg-amber-50/20' : 'border-amber-100 bg-white'}
                  `}
                >
                  <div className="text-center font-display border-b border-amber-50 pb-2">
                    <p className={`font-bold capitalize text-sm ${isHoje ? 'text-amber-800' : 'text-amber-950'}`}>{diaNome}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{diaNumero} {isHoje && '(Hoje)'}</p>
                  </div>

                  <div className="space-y-3 flex-1">
                    {day.totalUnidadesBolos > 0 && (
                      <div className="p-1 px-2 bg-pink-50 text-pink-700/90 rounded border border-pink-100/50 flex justify-between font-mono font-bold">
                        <span>🍰 Bolos:</span>
                        <span>{day.totalUnidadesBolos}</span>
                      </div>
                    )}
                    {day.totalUnidadesSalgados > 0 && (
                      <div className="p-1 px-2 bg-amber-50 text-amber-900 rounded border border-amber-100/50 flex justify-between font-mono font-bold">
                        <span>🥟 Salgados:</span>
                        <span>{day.totalUnidadesSalgados}</span>
                      </div>
                    )}
                    {day.totalUnidadesDoces > 0 && (
                      <div className="p-1 px-2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100/50 flex justify-between font-mono font-bold">
                        <span>🍬 Doces:</span>
                        <span>{day.totalUnidadesDoces}</span>
                      </div>
                    )}

                    {day.pedidos.length === 0 && (
                      <p className="text-center text-gray-400 italic text-[11px] py-4">Sem entregas</p>
                    )}
                  </div>

                  {day.pedidos.length > 0 && (
                    <div className="text-center pt-2 border-t border-amber-50">
                      <p className="text-[10px] font-semibold text-amber-900">{day.pedidos.length} encomendas</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* VIEW 3: MAIN LIST GENERAL FILTER */}
      {/* ---------------------------------------------------------------------------- */}
      {activeTab === 'lista' && (
        <div className="space-y-4" id="order-list-tab">
          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar pedido por cliente ou código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 border border-amber-100 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          {filteredPedidos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum pedido encontrado correspondente à busca.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-x-auto w-full hidden md:block">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-amber-50/30 text-amber-900 border-b border-amber-100">
                    <th className="p-3 pl-4 whitespace-nowrap">Código</th>
                    <th className="p-3 whitespace-nowrap">Cliente</th>
                    <th className="p-3 font-medium whitespace-nowrap">Entrega Prevista</th>
                    <th className="p-3 whitespace-nowrap">Itens Resumo</th>
                    <th className="p-3 font-semibold whitespace-nowrap">Valor Total</th>
                    <th className="p-3 whitespace-nowrap">Status</th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPedidos.map(p => {
                    const cliName = getClienteName(p.cliente_id);
                    const estEntrega = new Date(p.data_entrega_prevista);
                    const itCount = store.itensPedido.filter(it => it.pedido_id === p.id).length;

                    return (
                      <tr key={p.id} className="border-b border-amber-50/50 hover:bg-amber-50/10 transition">
                        <td className="p-3 pl-4 font-mono font-bold text-amber-700 whitespace-nowrap">#{p.id.substring(4).toUpperCase()}</td>
                        <td className="p-3 font-semibold text-amber-950 whitespace-nowrap">{cliName}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{estEntrega.toLocaleDateString('pt-BR')} às {estEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 whitespace-nowrap">{itCount} itens cadastrados</td>
                        <td className="p-3 font-bold text-amber-900 font-mono whitespace-nowrap">{formatCurrency(p.valor_total)}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                            ${p.status_id === 1 ? 'bg-gray-100 text-gray-600' : ''}
                            ${p.status_id === 2 ? 'bg-amber-100 text-amber-900 border border-amber-200' : ''}
                            ${p.status_id === 3 ? 'bg-indigo-100 text-indigo-700' : ''}
                            ${p.status_id === 4 ? 'bg-emerald-100 text-emerald-800' : ''}
                            ${p.status_id === 5 ? 'bg-gray-800 text-white' : ''}
                            ${p.status_id === 6 ? 'bg-red-100 text-red-700' : ''}
                          `}>
                            {store.statusNome(p.status_id)}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedPedidoId(p.id)}
                              className="text-amber-800 hover:underline font-bold"
                            >
                              Ver Ficha
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Tem certeza de que deseja deletar este pedido? As reservas físicas também serão desfeitas.')) {
                                  store.deletePedido(p.id);
                                  onUpdate();
                                }
                              }}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick mobile list version */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPedidos.map(p => {
              const cliName = getClienteName(p.cliente_id);
              const estEntrega = new Date(p.data_entrega_prevista);
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm space-y-3 text-xs" onClick={() => setSelectedPedidoId(p.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[9px] text-gray-400 font-bold">#{p.id.substring(4).toUpperCase()}</span>
                      <h4 className="font-semibold text-amber-950 text-sm mt-0.5">{cliName}</h4>
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">{store.statusNome(p.status_id)}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pt-2 border-t border-amber-50">
                    <span>Val: {formatCurrency(p.valor_total)}</span>
                    <span className="font-mono text-[10px]">Entrega: {estEntrega.toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* BUILDER MODAL: REGISTER / CREATE ORDER */}
      {/* ---------------------------------------------------------------------------- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans" id="modal-order-creation">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-xl flex flex-col justify-between border-t border-amber-100">
            <div className="p-6 border-b border-amber-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-display font-semibold text-base sm:text-lg text-amber-950">
                  {editingPedidoId ? 'Editar Encomenda' : 'Registrar Encomenda de Cliente'}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">{editingPedidoId ? 'Altere os dados necessários e salve as alterações.' : 'Selecione o cliente, os itens de salgados/bolos encomendados e execute a verificação inteligente de estoque.'}</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-amber-950 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveOrderSubmit} className="p-6 space-y-5">
              
              {/* Client and deliveries schedule inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 font-medium">Comprador / Cliente *</label>
                  <select 
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full p-2 border border-amber-200 rounded-lg text-xs bg-white"
                    required
                  >
                    <option value="" disabled>--- Selecione o Cliente ---</option>
                    {store.clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome} ({store.tipoClienteNome(c.tipo_id)})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 font-medium font-sans">Data / Hora Agendada de Entrega *</label>
                  <input 
                    type="datetime-local" 
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    className="w-full p-2 border border-amber-200 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Items builder composer list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-1">
                  <h4 className="font-display font-semibold text-amber-900 uppercase tracking-wider text-[10px]">Composição do Pedido</h4>
                  <button 
                    type="button" 
                    onClick={handleAddItemRow}
                    className="text-amber-800 hover:text-amber-950 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>

                <div className="space-y-2">
                  {itensPedido.map((item, idx) => {
                    const prodRef = store.produtos.find(p => p.id === item.produto_id);
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 items-center bg-orange-50/10 p-2.5 rounded-lg border border-amber-100/50">
                        {/* Selected product dropdown */}
                        <div className="w-full sm:flex-1 space-y-1">
                          <label className="text-[9px] font-semibold text-amber-900/60 uppercase">Produto</label>
                          <select 
                            value={item.produto_id}
                            onChange={(e) => handleUpdateItemRow(idx, { produto_id: e.target.value })}
                            className="w-full p-1.5 border border-amber-200 bg-white rounded text-xs"
                          >
                            {store.produtos.map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity input requested */}
                        <div className="w-full sm:w-28 space-y-1">
                          <label className="text-[9px] font-semibold text-amber-900/60 uppercase">Quantidade</label>
                          <div className="flex items-center border border-amber-200 rounded bg-white">
                            <input 
                              type="number"
                              min="1"
                              value={item.quantidade_solicitada}
                              onChange={(e) => handleUpdateItemRow(idx, { quantidade_solicitada: Number(e.target.value) })}
                              className="w-full p-1.5 focus:outline-none font-mono text-xs text-center"
                              required
                            />
                            <span className="bg-amber-100 px-2 py-1 text-[9px] text-amber-900 font-bold whitespace-nowrap font-mono border-l border-amber-200">
                              {store.unidadeNome(prodRef?.unidade_producao_id || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Custom price per unit */}
                        <div className="w-full sm:w-24 space-y-1">
                          <label className="text-[9px] font-semibold text-amber-900/60 uppercase">R$ Unitário</label>
                          <input 
                            type="number" 
                            step="any"
                            value={item.preco_unitario}
                            onChange={(e) => handleUpdateItemRow(idx, { preco_unitario: Number(e.target.value) })}
                            className="w-full p-1.5 border border-amber-200 rounded font-mono text-xs"
                            required
                          />
                        </div>

                        <div className="w-full sm:w-20 text-right pt-3 sm:pt-4">
                          <span className="text-[10px] text-gray-500 font-mono">
                            {formatCurrency((item.quantidade_solicitada * item.preco_unitario))}
                          </span>
                        </div>

                        <div className="pt-2 sm:pt-4">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons inside form to trigger validation checks! */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-amber-50/50 p-2.5 rounded-lg">
                  <span className="font-semibold text-amber-950 font-sans">Executar Verificação de Viabilidade</span>
                  <button 
                    type="button" 
                    onClick={triggerLiveStockValidation}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1 px-3 rounded-lg flex items-center gap-1 font-sans transition shadow-sm"
                  >
                    Analisar Estoque & Insumos 🔍
                  </button>
                </div>

                {/* Validation Results Displays */}
                {analiseResultado && (
                  <div className="border border-amber-100 rounded-xl p-3 bg-white space-y-2 text-[11px] animate-in slide-in-from-top-1">
                    {analiseResultado.tudoDisponivelEmEstoquePronto ? (
                      <em className="text-emerald-800 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        <span>Excelente! Há produtos prontos suficientes estocados na prateleira para cobrir esta encomenda.</span>
                      </em>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-900 leading-relaxed font-semibold">
                          ⚠️ Prateleiras insuficientes! Será necessário produzir o restante de forma complementar.
                        </div>

                        {/* Deficit materials detail lists */}
                        {!analiseResultado.podeProduzirRestante ? (
                          <div className="p-3 rounded-lg bg-red-100/50 border border-red-200 text-red-800 space-y-1">
                            <p className="font-bold font-sans flex items-center gap-1">
                              <AlertTriangle size={15} className="text-red-500 font-semibold" /> Cuidado: Insumos Insuficientes na Cozinha para Cozinhar!
                            </p>
                            <ul className="list-disc list-inside font-semibold pl-1 space-y-0.5 text-[10px]">
                              {analiseResultado.resumoFaltasMateriais.map((f, fIdx) => (
                                <li key={fIdx}>
                                  Faltam <span className="font-mono font-bold text-red-600">{f.falta.toFixed(2)}{f.unidade}</span> de {f.materialNome}
                                </li>
                              ))}
                            </ul>
                            <p className="text-[9px] text-gray-500 leading-snug mt-1 italic">
                              Você pode rascunhar o pedido, mas travará na cozinha ao tentar "Iniciar Produção" até que os ingredientes acima sejam comprados ou reabastecidos.
                            </p>
                          </div>
                        ) : (
                          <em className="text-emerald-800 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-600 font-semibold" />
                            <span>Insumos suficientes! Apesar de não haver pronto estocado, a cozinha possui ingredientes bastantes para assar este pedido.</span>
                          </em>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Note / adjustments elements */}
              <div className="space-y-1">
                <label className="text-amber-950 font-medium font-sans">Observações Especiais do Pedido / Detalhes de Decoração</label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Coxinhas com catupiry. Brigadeiros decorados com granulado dourado."
                  className="w-full h-14 p-2 border border-amber-200 rounded-lg text-xs"
                />
              </div>

              {/* Total calculation strip */}
              <div className="p-3 bg-emerald-100/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs" id="order-pricing-strip">
                <span className="font-bold text-emerald-950 flex items-center gap-1 font-sans">
                  <DollarSign size={15} className="text-emerald-600" /> Valor Total Estimado da Encomenda:
                </span>
                <span className="font-bold font-mono text-emerald-800 text-lg">
                  {formatCurrency(itensPedido.reduce((acc, current) => acc + (current.quantidade_solicitada * current.preco_unitario), 0))}
                </span>
              </div>

              {/* Saving or rascunho switches options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-1 cursor-pointer font-semibold text-amber-950">
                  <input type="radio" checked={statusId === 2} onChange={() => setStatusId(2)} className="text-amber-700" /> Ativo / Confirmado
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-gray-500">
                  <input type="radio" checked={statusId === 1} onChange={() => setStatusId(1)} className="text-amber-700" /> Guardar Rascunho
                </label>
              </div>

              {/* Submit footer links */}
              <div className="flex items-center gap-3 pt-3 border-t border-amber-100">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-bold py-2.5 rounded-xl text-center shadow-md font-sans text-xs"
                >
                  Confirmar Encomenda
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------------- */}
      {/* DIALOG DETAILS MODAL FOR SELECTION CARDS */}
      {/* ---------------------------------------------------------------------------- */}
      {selectedPedidoId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans" id="modal-order-details">
          {(() => {
            const p = store.pedidos.find(ped => ped.id === selectedPedidoId);
            if (!p) return null;

            const cli = store.clientes.find(c => c.id === p.cliente_id);
            const itens = store.itensPedido.filter(it => it.pedido_id === p.id);
            const estEntrega = new Date(p.data_entrega_prevista);

            // Compute live stock checks details specifically for details panel
            const formatados = itens.map(it => {
              const prod = store.produtos.find(prd => prd.id === it.produto_id);
              return {
                produtoId: it.produto_id,
                produtoNome: prod?.nome || 'N/A',
                quantidadeSolicitada: it.quantidade_solicitada
              };
            });
            const analise = analisarEstoqueParaPedido(formatados, store.estoqueProdutos, store.fichas, store.materiais, store.unidades);

            return (
              <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col justify-between max-h-[90vh] overflow-y-auto no-scrollbar border-t border-amber-100">
                <div className="p-6 border-b border-amber-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-lg text-amber-950">Ficha do Pedido Encomendado</h3>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{p.id.substring(4).toUpperCase()} | Data: {new Date(p.data_pedido).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button onClick={() => setSelectedPedidoId(null)} className="text-gray-450 hover:text-amber-950 p-1">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Customer sheet card */}
                  <div className="space-y-2 bg-gradient-to-br from-amber-50/20 to-orange-50/20 p-3.5 rounded-xl border border-amber-150/55">
                    <p className="text-[10px] font-bold text-amber-900 uppercase">Dados do Cliente</p>
                    <p className="font-semibold text-sm text-amber-950 font-display">{cli?.nome}</p>
                    <p className="text-[11px] text-gray-600 flex items-center gap-1 font-mono"><MapPin size={11} /> {cli?.endereco}</p>
                    <p className="text-[11px] text-gray-600 flex items-center gap-1 font-mono"><Clock size={11} /> Delivery: {estEntrega.toLocaleDateString('pt-BR')} às {estEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    {p.observacoes && <p className="text-[11px] text-amber-900 border-t border-amber-100/50 pt-2 italic">obs: "{p.observacoes}"</p>}
                  </div>

                  {/* Items list detail panel */}
                  <div className="space-y-3">
                    <p className="font-display font-semibold text-amber-900 uppercase tracking-wider text-[10px] border-b border-amber-100 pb-1">Ingredientes & Produtos da Encomenda</p>
                    <div className="space-y-2">
                      {itens.map((it, idx) => {
                        const prod = store.produtos.find(prd => prd.id === it.produto_id);
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-orange-50/10 border border-amber-100/50 flex justify-between items-center text-[11px]">
                            <div>
                              <p className="font-semibold text-amber-950">{prod?.nome}</p>
                              {it.observacao && <p className="text-[9px] text-gray-400 mt-0.5">{it.observacao}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono text-amber-900">{it.quantidade_solicitada} {store.unidadeNome(prod?.unidade_producao_id || 0)}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{formatCurrency(it.preco_unitario)} cada</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational status alerts inside details drawer for physical reservations */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-amber-900/60 block">Status Operacional do Estoque</label>
                    {analise.tudoDisponivelEmEstoquePronto ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1.5 text-[10px]">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Pronto livre estocado cobre este pedido perfeitamente.</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="p-2 bg-amber-50 text-amber-900 text-[10px] rounded border border-amber-100 leading-snug">
                          Apenas <span className="font-bold">{itens.length > 0 ? (analise.itensAnalise[0]?.disponivelEstoque || 0) : 0}</span> itens estão prontos. O déficit complementar restante necessita de fabricação na cozinha.
                        </div>

                        {!analise.podeProduzirRestante && (
                          <div className="p-3 rounded-lg bg-red-100/50 border border-red-200 text-red-800 text-[10px]">
                            <p className="font-bold font-sans flex items-center gap-1"><AlertTriangle size={14} /> Produção Complementar Bloqueada por Insumos:</p>
                            <ul className="list-disc list-inside mt-1 font-semibold text-[9px] pl-1">
                              {analise.resumoFaltasMateriais.map((f, fIdx) => (
                                <li key={fIdx}>{f.materialNome}: faltam <span className="font-mono font-bold">{f.falta.toFixed(2)}{f.unidade}</span></li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flow control status controls rows inside details */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase text-amber-900/60 block">Mudança de Fase Operacional</label>
                    <div className="flex flex-wrap gap-2">
                      {(p.status_id === 1 || p.status_id === 2) && (
                        <button
                          onClick={() => handleOpenEditOrder(p.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg"
                        >
                          ✏️ Editar Pedido
                        </button>
                      )}

                      {p.status_id === 1 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 2)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-3 rounded-lg"
                        >
                          Confirmar Encomenda ✔️
                        </button>
                      )}
                      
                      {p.status_id === 2 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 3)}
                          disabled={!analise.tudoDisponivelEmEstoquePronto && !analise.podeProduzirRestante}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                        >
                          🥘 Iniciar Produção (Cozinha)
                        </button>
                      )}

                      {p.status_id === 3 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 4)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                        >
                          📦 Prontificar Assado (Pronto)
                        </button>
                      )}

                      {p.status_id === 4 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 5)}
                          className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1"
                        >
                          🚚 Confirmar Entrega de Pedido
                        </button>
                      )}

                      {p.status_id !== 5 && p.status_id !== 6 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 6)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1 px-3 rounded-lg"
                        >
                          Cancelar Pedido ❌
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Pagamento info + link to Caixa */}
                <div className="px-6 space-y-3">
                  <div className="border-t border-amber-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-display font-semibold text-amber-900 uppercase tracking-wider text-[10px]">
                        Pagamentos
                      </p>
                      <button
                        onClick={() => onNavigateToCaixa?.(p.id)}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-600 flex items-center gap-1"
                      >
                        🪙 Ir para Caixa
                      </button>
                    </div>
                    {(() => {
                      const recebimentos = store.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita');
                      const totalRecebido = recebimentos.reduce((s, l) => s + l.valor, 0);
                      const saldoRestante = p.valor_total - totalRecebido;
                      const estaPago = saldoRestante <= 0;
                      return (
                        <div>
                          {recebimentos.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">Nenhum pagamento registrado</p>
                          ) : (
                            <div className="space-y-1.5">
                              {recebimentos.map(l => (
                                <div key={l.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-emerald-50/30 border border-emerald-100/50">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600 font-mono">{new Date(l.data_lancamento).toLocaleDateString('pt-BR')}</span>
                                    <span className="text-gray-400">{l.forma_pagamento || '—'}</span>
                                  </div>
                                  <span className="font-bold font-mono text-emerald-700">{formatCurrency(l.valor)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-100/50 text-xs">
                            <span className="text-gray-500">Total recebido</span>
                            <span className="font-bold font-mono text-emerald-700">{formatCurrency(totalRecebido)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Saldo pendente</span>
                            <span className={`font-bold font-mono ${estaPago ? 'text-emerald-600' : 'text-red-500'}`}>
                              {estaPago ? '✓ Pago' : formatCurrency(saldoRestante)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-6 bg-amber-50/20 border-t border-amber-100 flex items-center justify-between">
                  <div className="font-mono text-xs text-amber-950">
                    Total: <span className="font-bold text-sm text-amber-900">{formatCurrency(p.valor_total)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPedidoId(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-2 rounded-xl text-center"
                  >
                    Fechar Detalhes
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}


