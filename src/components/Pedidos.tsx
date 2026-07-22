import React, { useState, useMemo, useEffect } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Pedido, Cliente } from '../types';
import { useSmartArrowKeys } from '../lib/hooks/useSmartArrowKeys';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
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
  DollarSign,
  FileText,
  Printer,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';
import { analisarEstoqueParaPedido } from '../lib/calculos';
import RelatorioPedidos from './RelatorioPedidos';
import SelectSearch from './SelectSearch';

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface PedidosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
  // Trigger order modal directly (used by quick dashboard buttons too)
  forceOpenNewOrderRef?: { trigger: () => void };
  onNavigateToCaixa?: (pedidoId?: string) => void;
}

export default function Pedidos({ store, onUpdate, forceOpenNewOrderRef, onNavigateToCaixa }: PedidosProps) {
  const getAppName = () => localStorage.getItem('appName') || 'Mini Fábrica';
  const getLogoUrl = () => store.dadosEmpresa?.logo_url || '';
  const getSlogan = () => store.dadosEmpresa?.slogan || 'Sistema de Gestão de Produção e Pedidos';
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
  const [categoriaReceitaId, setCategoriaReceitaId] = useState<number>(0);
  const [descontoValor, setDescontoValor] = useState(0);
  const categoriasReceita = store.categoriasFinanceiro.filter(c => c.tipo === 'receita');

  // Selected Order detail popup state
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  
  // Reverse confirmation modal (voltar/cancelar pedido)
  const [reverseConfirm, setReverseConfirm] = useState<{ pedidoId: string; targetStatus: number; fromStatus: number } | null>(null);

  // Custom alert modal (replaces native alert())
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Estorno pendente filter
  const [showEstornoPendente, setShowEstornoPendente] = useState(false);
  const [statusFilter, setStatusFilter] = useState('0');
  
  // Relatorio modal
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  
  // Delete pedido confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Estorno confirmation
  const [estornoConfirm, setEstornoConfirm] = useState<string | null>(null);
  const [insufficientItemsEdit, setInsufficientItemsEdit] = useState<{
    pedidoId: string;
    items: Array<{
      produtoId: string;
      produtoNome: string;
      itemPedidoId: string;
      estoqueProdutoId: string;
      pedidoQtd: number;
      estoqueQtd: number;
      originalPedidoQtd: number;
      originalEstoqueQtd: number;
      unidade: string;
    }>;
  } | null>(null);
  
  // Edit mode
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  
  // Live ingredient depletion analyzer inside Order Creator
  const [analiseResultado, setAnaliseResultado] = useState<ReturnType<typeof analisarEstoqueParaPedido> | null>(null);



  // Reverse modal checkbox states
  const [revReverterProducao, setRevReverterProducao] = useState(true);
  const [revRestaurarInsumos, setRevRestaurarInsumos] = useState(true);
  const [revRemoverProdutos, setRevRemoverProdutos] = useState(true);
  const [revReporEstoque, setRevReporEstoque] = useState(true);
  const [revEstornar, setRevEstornar] = useState(false);

  // Drag and drop states for Kanban columns
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Lock body scroll when any modal is open
  const anyModalOpen = isFormOpen || !!selectedPedidoId || !!reverseConfirm || !!customAlert || !!deleteConfirm || !!estornoConfirm || !!insufficientItemsEdit || relatorioOpen;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

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
    setCategoriaReceitaId(0);
    setDescontoValor(0);
    setItensPedido([]);
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
    setCategoriaReceitaId(pedido.categoria_receita_id || 0);
    setDescontoValor(pedido.desconto_valor ?? 0);

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
    if (store.produtos.length === 0) {
      setCustomAlert({ title: 'Sem produtos', message: 'Nenhum produto cadastrado. Cadastre produtos antes de criar um pedido.' });
      return;
    }
    const usedIds = itensPedido.map(it => it.produto_id).filter(Boolean);
    const unused = store.produtos.find(p => !usedIds.includes(p.id));
    if (!unused) {
      setCustomAlert({ title: 'Limite atingido', message: 'Todos os produtos disponíveis já foram adicionados ao pedido.' });
      return;
    }
    setItensPedido([
      ...itensPedido,
      { produto_id: '', quantidade_solicitada: 1, preco_unitario: 0 }
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItensPedido(itensPedido.filter((_, i) => i !== idx));
  };

  const handleUpdateItemRow = (idx: number, fields: Partial<typeof itensPedido[0]>) => {
    const next = [...itensPedido];
    next[idx] = { ...next[idx], ...fields };

    if (fields.produto_id) {
      const selectedProd = store.produtos.find(p => p.id === fields.produto_id);
      if (selectedProd) {
        next[idx].preco_unitario = selectedProd.preco_venda || 0;
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

  const handleSaveOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      setCustomAlert({ title: 'Cliente necessário', message: 'Por favor cadastre ou selecione um cliente.' });
      return;
    }
    const validItens = itensPedido.filter(it => it.produto_id);
    if (validItens.length === 0) {
      setCustomAlert({ title: 'Produto necessário', message: 'Adicione pelo menos 1 produto no pedido.' });
      return;
    }

    if (editingPedidoId) {
      const updateOk = await store.updatePedido(editingPedidoId, {
        cliente_id: clienteId,
        status_id: statusId,
        data_entrega_prevista: dataEntrega,
        observacoes: observacoes,
        criado_by: 'Cozinha',
        categoria_receita_id: categoriaReceitaId || undefined,
        desconto_valor: descontoValor,
      });

      if (!updateOk) {
        setCustomAlert({ title: 'Erro ao salvar', message: 'Não foi possível atualizar o pedido no servidor. Verifique sua conexão.' });
        return;
      }

      const existingItens = store.itensPedido.filter(it => it.pedido_id === editingPedidoId);
      const newItemKeys = validItens.map(item => `${item.produto_id}_${item.preco_unitario}_${item.observacao || ''}`);

      // Remove items that are no longer in the list
      for (const existingItem of existingItens) {
        const key = `${existingItem.produto_id}_${existingItem.preco_unitario}_${existingItem.observacao || ''}`;
        if (!newItemKeys.includes(key)) {
          await store.deleteItemPedido(existingItem.id);
        }
      }

      // Add or update items
      for (let idx = 0; idx < validItens.length; idx++) {
        const item = validItens[idx];
        const existing = existingItens[idx];
        if (existing) {
          await store.updateItemPedido(existing.id, {
            produto_id: item.produto_id,
            quantidade_solicitada: item.quantidade_solicitada,
            preco_unitario: item.preco_unitario,
            observacao: item.observacao
          });
        } else {
          await store.addItemPedido({
            pedido_id: editingPedidoId,
            produto_id: item.produto_id,
            quantidade_solicitada: item.quantidade_solicitada,
            quantidade_produzida: 0,
            preco_unitario: item.preco_unitario,
            observacao: item.observacao
          });
        }
      }

      setEditingPedidoId(null);
      setIsFormOpen(false);
      onUpdate();
      return;
    }

    // Save order
    const savedPedido = await store.addPedido({
      cliente_id: clienteId,
      status_id: statusId,
      data_entrega_prevista: dataEntrega,
      observacoes: observacoes,
      criado_by: 'Cozinha',
      categoria_receita_id: categoriaReceitaId || undefined,
      desconto_valor: descontoValor,
    });

    if (!savedPedido) return;

    for (const item of validItens) {
      await store.addItemPedido({
        pedido_id: savedPedido.id,
        produto_id: item.produto_id,
        quantidade_solicitada: item.quantidade_solicitada,
        quantidade_produzida: 0,
        preco_unitario: item.preco_unitario,
        observacao: item.observacao
      });
    }

    setIsFormOpen(false);
    onUpdate();
  };

  const handleTransitionStatus = async (pedId: string, novoSt: number) => {
    const result = (await store.updatePedidoStatus(pedId, novoSt)) as { success: boolean; error?: string; insufficientItems?: Array<{produtoId: string; produtoNome: string; disponivel: number; necessario: number; unidade: string}> };
    if (!result.success) {
      if (result.insufficientItems && result.insufficientItems.length > 0) {
        const items = result.insufficientItems.map(item => {
          const itemPedido = store.itensPedido.find(ip => ip.pedido_id === pedId && ip.produto_id === item.produtoId);
          const estoque = store.estoqueProdutos.find(ep => ep.produto_id === item.produtoId);
          return {
            produtoId: item.produtoId,
            produtoNome: item.produtoNome,
            itemPedidoId: itemPedido?.id || '',
            estoqueProdutoId: estoque?.id || '',
            pedidoQtd: item.necessario,
            estoqueQtd: item.disponivel,
            originalPedidoQtd: item.necessario,
            originalEstoqueQtd: item.disponivel,
            unidade: item.unidade,
          };
        });
        setInsufficientItemsEdit({ pedidoId: pedId, items });
      } else {
        setCustomAlert({ title: 'Erro', message: result.error || 'Erro desconhecido' });
      }
    } else {
      onUpdate();
    }
  };

  const handleInsufficientItemChange = (index: number, field: 'pedidoQtd' | 'estoqueQtd', value: number) => {
    setInsufficientItemsEdit(prev => {
      if (!prev) return prev;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: Math.max(0, value) };
      return { ...prev, items: newItems };
    });
  };

  const handleInsufficientConfirm = async () => {
    const edit = insufficientItemsEdit;
    if (!edit) return;
    setInsufficientItemsEdit(null);

    let changed = false;
    for (const item of edit.items) {
      if (item.pedidoQtd !== item.originalPedidoQtd) {
        await store.updateItemPedido(item.itemPedidoId, { quantidade_solicitada: item.pedidoQtd });
        changed = true;
      }
      if (item.estoqueQtd !== item.originalEstoqueQtd) {
        await store.ajustarEstoqueProduto(item.estoqueProdutoId, item.estoqueQtd, 'Ajuste manual por entrega');
        changed = true;
      }
    }

    if (changed) {
      const retry = (await store.updatePedidoStatus(edit.pedidoId, 5)) as { success: boolean; error?: string; insufficientItems?: Array<{produtoId: string; produtoNome: string; disponivel: number; necessario: number; unidade: string}> };
      if (!retry.success) {
        if (retry.insufficientItems && retry.insufficientItems.length > 0) {
          const items = retry.insufficientItems.map(item => {
            const itemPedido = store.itensPedido.find(ip => ip.pedido_id === edit.pedidoId && ip.produto_id === item.produtoId);
            const estoque = store.estoqueProdutos.find(ep => ep.produto_id === item.produtoId);
            return {
              produtoId: item.produtoId,
              produtoNome: item.produtoNome,
              itemPedidoId: itemPedido?.id || '',
              estoqueProdutoId: estoque?.id || '',
              pedidoQtd: item.necessario,
              estoqueQtd: item.disponivel,
              originalPedidoQtd: item.necessario,
              originalEstoqueQtd: item.disponivel,
              unidade: item.unidade,
            };
          });
          setInsufficientItemsEdit({ pedidoId: edit.pedidoId, items });
        } else {
          setCustomAlert({ title: 'Erro', message: retry.error || 'Erro ao processar' });
        }
      } else {
        onUpdate();
      }
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
    if (!matchesSearch) return false;
    if (statusFilter !== '0' && p.status_id !== Number(statusFilter)) return false;
    if (showEstornoPendente && !store.getEstornoPendente().some(e => e.id === p.id)) return false;
    return true;
  });

  const { sortedItems: sortedPedidos, requestSort, sortConfig } = useSortableData(filteredPedidos, 'data_pedido');

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
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-amber-700 dark:text-amber-400" />
            <h1 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Pedidos</h1>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50 mt-1">Monitore rascunhos, confirme pedidos, verifique insumos deficientes e trace o Kanban semanal.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {store.hasPermission('pedidos.criar') && (
            <button 
              onClick={handleOpenNewOrder}
              className="bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-700 shadow-sm text-white text-xs font-semibold font-sans py-2 px-4 rounded-xl transition flex items-center gap-1.5 justify-center"
              data-help="pedidos-novo"
            >
              <PlusCircle size={16} /> Novo Pedido
            </button>
          )}
          <button 
            onClick={() => setRelatorioOpen(true)}
            className="bg-white hover:bg-amber-50 border border-amber-200 shadow-sm text-amber-800 text-xs font-semibold font-sans py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 justify-center font-medium"
          >
            <FileText size={16} /> Relatório
          </button>
        </div>
      </div>

      {/* Segment tabs */}
      <div className="flex border-b border-amber-100 dark:border-[#22160b] gap-4" id="orders-tabs">
        <button 
          onClick={() => setActiveTab('kanban')}
          data-help="pedidos-kanban"
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
          data-help="pedidos-lista"
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
              { id: 2, title: 'Confirmado', color: 'bg-amber-50/45 dark:bg-[#1a1107]/40 border-amber-100 dark:border-[#382613]/55', text: 'text-amber-950 dark:text-amber-200', badge: 'bg-amber-200 dark:bg-amber-950/80 dark:text-amber-200' },
              { id: 3, title: 'Produzindo', color: 'bg-indigo-50/20 dark:bg-[#111124]/30 border-indigo-100 dark:border-[#22224c]/40', text: 'text-indigo-900 dark:text-indigo-300', badge: 'bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-200' },
              { id: 4, title: 'Pronto p/ Entrega', color: 'bg-emerald-50/20 dark:bg-[#071a10]/30 border-emerald-100 dark:border-[#133c24]/40', text: 'text-emerald-900 dark:text-emerald-305', badge: 'bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' },
              { id: 5, title: 'Entregues Recentes', color: 'bg-gray-50/20 dark:bg-[#111111]/30 border-gray-100 dark:border-[#222222]/40', text: 'text-gray-650 dark:text-gray-300', badge: 'bg-gray-200 dark:bg-gray-800 dark:text-gray-300' }
            ].map(col => {
              const ordersInCol = filteredPedidos.filter(p => p.status_id === col.id).sort((a, b) => new Date(a.data_entrega_prevista).getTime() - new Date(b.data_entrega_prevista).getTime());
              
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
                      const pedido = store.pedidos.find(p => p.id === orderId);
                      if (pedido) {
                        const diff = col.id - pedido.status_id;
                        if (diff > 1) {
                          setCustomAlert({ title: 'Fluxo inválido', message: 'Avance uma etapa por vez. Use "Atender do Estoque" no painel de detalhes se o produto já estiver em estoque.' });
                        } else if (diff < -1) {
                          setCustomAlert({ title: 'Fluxo inválido', message: 'Volte uma etapa por vez para evitar inconsistências.' });
                        } else if (diff < 0) {
                          setReverseConfirm({ pedidoId: orderId, targetStatus: col.id, fromStatus: pedido.status_id });
                        } else {
                          handleTransitionStatus(orderId, col.id);
                        }
                      }
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
                              {store.getEstornoPendente().some(e => e.id === p.id) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                  ⚠️ Estorno Pendente
                                </span>
                              )}
                              {/* Fast click status controllers */}
                              <div className="flex items-center gap-1 shrink-0">
                                {p.status_id === 2 && store.hasPermission('pedidos.editar') && (
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
                                {p.status_id === 3 && store.hasPermission('pedidos.editar') && (
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
                                {p.status_id === 4 && store.hasPermission('pedidos.editar') && (
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
          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar pedido por cliente ou código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 h-9 text-xs rounded-xl bg-orange-50/20 border border-amber-100 focus:outline-none focus:border-amber-400 transition"
              />
            </div>
            <div className="w-44">
              <SelectSearch value={statusFilter} onChange={v => setStatusFilter(v)} options={[{ value: '0', label: 'Todos os status' }, ...store.statusPedido.map(s => ({ value: String(s.id), label: s.nome }))]} placeholder="Filtrar por status" />
            </div>
            <button onClick={() => setShowEstornoPendente(!showEstornoPendente)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1 ${
                showEstornoPendente
                  ? 'bg-orange-100 text-orange-800 border border-orange-300'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}>
              ⚠️ Estorno Pendente {showEstornoPendente ? '✓' : `(${store.getEstornoPendente().length})`}
            </button>
          </div>

          {sortedPedidos.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Nenhum pedido encontrado correspondente à busca.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-x-auto w-full hidden md:block">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-amber-50/30 text-amber-900 border-b border-amber-100">
                    <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Código" sortKey="id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Cliente" sortKey="cliente_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 font-medium whitespace-nowrap"><SortButton label="Entrega Prevista" sortKey="data_entrega_prevista" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right whitespace-nowrap">Itens Resumo</th>
                    <th className="p-3 text-right font-semibold whitespace-nowrap"><SortButton label="Valor Total" sortKey="valor_total" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                    <th className="p-3 whitespace-nowrap"><SortButton label="Status" sortKey="status_id" sortConfig={sortConfig} onSort={requestSort} /></th>
                    <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPedidos.map(p => {
                    const cliName = getClienteName(p.cliente_id);
                    const estEntrega = new Date(p.data_entrega_prevista);
                    const itCount = store.itensPedido.filter(it => it.pedido_id === p.id).length;

                    return (
                      <tr key={p.id} className="border-b border-amber-50/50 hover:bg-amber-50/10 transition">
                        <td className="p-3 pl-4 font-mono font-bold text-amber-700 whitespace-nowrap">#{p.id.substring(4).toUpperCase()}</td>
                        <td className="p-3 font-semibold text-amber-950 whitespace-nowrap">{cliName}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{estEntrega.toLocaleDateString('pt-BR')} às {estEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 text-right whitespace-nowrap">{itCount} itens cadastrados</td>
                        <td className="p-3 text-right font-bold text-amber-900 font-mono whitespace-nowrap">{formatCurrency(p.valor_total)}</td>
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
                          {store.getEstornoPendente().some(e => e.id === p.id) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 ml-1">
                              ⚠️ Estorno Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedPedidoId(p.id)}
                              className="text-amber-800 hover:underline font-bold"
                            >
                              Ver Ficha
                            </button>
                            {store.hasPermission('pedidos.excluir') && (
                              <button 
                                onClick={() => setDeleteConfirm(p.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
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
            {sortedPedidos.map(p => {
              const cliName = getClienteName(p.cliente_id);
              const estEntrega = new Date(p.data_entrega_prevista);
              return (
                <div key={p.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm space-y-3 text-xs" onClick={() => setSelectedPedidoId(p.id)}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[9px] text-gray-400 font-bold">#{p.id.substring(4).toUpperCase()}</span>
                      <h4 className="font-semibold text-amber-950 text-sm mt-0.5">{cliName}</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase">{store.statusNome(p.status_id)}</span>
                      {store.getEstornoPendente().some(e => e.id === p.id) && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          ⚠️
                        </span>
                      )}
                    </div>
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
      {isFormOpen && (() => {
        const subtotal = itensPedido.reduce((acc, cur) => acc + (cur.quantidade_solicitada * cur.preco_unitario), 0);
        const totalGeral = Math.max(0, subtotal - descontoValor);

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans" id="modal-order-creation">
            <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl h-screen sm:max-h-[90vh] flex flex-col shadow-xl">
              <form onSubmit={handleSaveOrderSubmit} className="flex-1 flex flex-col min-h-0">

                {/* ── TOPBAR FIXA ─────────────────────────────────────── */}
                <header className="shrink-0 border-b border-amber-100 px-4 py-3 space-y-3">

                  {/* Título + fechar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-base text-amber-950">
                        {editingPedidoId ? '✏️ Editar Encomenda' : '📦 Nova Encomenda'}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {editingPedidoId
                          ? 'Altere os dados necessários e salve.'
                          : 'Selecione o cliente, produtos e verifique o estoque.'}
                      </p>
                    </div>
                    <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-amber-950 p-1 rounded-lg hover:bg-gray-100 transition">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Linha 1 — campos cabeçalho lado a lado */}
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-56">
                      <label className="text-[10px] text-gray-500 block mb-1">Cliente *</label>
                      <SelectSearch
                        value={clienteId}
                        onChange={setClienteId}
                        options={store.clientes.map(c => ({ value: c.id, label: c.nome }))}
                        placeholder="Selecione um cliente"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Data de Entrega *</label>
                      <input
                        type="datetime-local"
                        value={dataEntrega}
                        onChange={(e) => setDataEntrega(e.target.value)}
                        className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-mono focus:outline-none focus:border-amber-400 bg-white"
                        required
                      />
                    </div>

                    <div className="w-40">
                      <label className="text-[10px] text-gray-500 block mb-1">Categoria Financeira</label>
                      <SelectSearch
                        value={categoriaReceitaId.toString()}
                        onChange={v => setCategoriaReceitaId(Number(v))}
                        options={[
                          { value: '0', label: 'Sem categoria' },
                          ...categoriasReceita.map(c => ({ value: c.id.toString(), label: c.nome })),
                        ]}
                        placeholder="Categoria"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Status</label>
                      <select
                        value={statusId}
                        onChange={(e) => setStatusId(Number(e.target.value))}
                        className="h-9 border border-gray-200 rounded-lg px-2 text-xs font-semibold focus:outline-none focus:border-amber-400 bg-white"
                      >
                        <option value={2}>Confirmado</option>
                        <option value={1}>Rascunho</option>
                      </select>
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Observações / Detalhes de Decoração</label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Ex: Coxinhas com catupiry. Brigadeiros com granulado dourado."
                      className="w-full h-12 p-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>
                </header>

                {/* ── ÁREA ROLÁVEL — ITENS ────────────────────────────── */}
                <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">

                  {/* Label + botão adicionar */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-amber-900 uppercase tracking-wider text-[10px] font-sans">
                      Itens do Pedido
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800 text-[10px] font-semibold hover:bg-amber-50 active:bg-amber-100 transition"
                    >
                      <Plus size={13} /> Adicionar item
                    </button>
                  </div>

                  {/* Desktop/tablet — tabela com borda suave */}
                  <div className="hidden md:block overflow-hidden rounded-lg border border-amber-100">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-amber-50/60 text-amber-900">
                          <th className="text-left font-semibold px-3 py-2 border-b border-amber-100">Produto</th>
                          <th className="text-center font-semibold px-3 py-2 border-b border-amber-100 w-28">Qtd</th>
                          <th className="text-right font-semibold px-3 py-2 border-b border-amber-100 w-28">R$ Unitário</th>
                          <th className="text-right font-semibold px-3 py-2 border-b border-amber-100 w-24">Total item</th>
                          <th className="px-3 py-2 border-b border-amber-100 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensPedido.map((item, idx) => {
                          const prodRef = store.produtos.find(p => p.id === item.produto_id);
                          return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'}>
                              <td className="px-2 py-1.5 border-b border-amber-50">
                                <SelectSearch
                                  value={item.produto_id}
                                  onChange={(v) => handleUpdateItemRow(idx, { produto_id: v })}
                                  options={store.produtos.filter(p => !itensPedido.some((it, i) => i !== idx && it.produto_id && it.produto_id === p.id)).map(p => ({ value: p.id, label: p.nome }))}
                                  placeholder="Selecione o produto"
                                />
                              </td>
                              <td className="px-2 py-1.5 border-b border-amber-50">
                                <div className="flex items-center border border-amber-200 rounded-md bg-white">
                                  <input
                                    type="number" min="1"
                                    value={item.quantidade_solicitada}
                                    onChange={(e) => handleUpdateItemRow(idx, { quantidade_solicitada: Number(e.target.value) })}
                                    {...useSmartArrowKeys(item.quantidade_solicitada, (v) => handleUpdateItemRow(idx, { quantidade_solicitada: v }), 1)}
                                    className="w-full h-9 px-2 focus:outline-none font-mono text-xs text-center bg-transparent"
                                    required
                                  />
                                  <span className="bg-amber-100 px-1.5 h-9 flex items-center text-[9px] text-amber-900 font-bold font-mono border-l border-amber-200 rounded-r-md">
                                    {store.unidadeSigla(prodRef?.unidade_producao_id || 0)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-2 py-1.5 border-b border-amber-50">
                                <input
                                  type="number" step="0.01" inputMode="decimal"
                                  value={item.preco_unitario}
                                  onChange={(e) => handleUpdateItemRow(idx, { preco_unitario: Number(e.target.value) })}
                                  {...useSmartArrowKeys(item.preco_unitario, (v) => handleUpdateItemRow(idx, { preco_unitario: v }), 0)}
                                  className="w-full h-9 border border-amber-200 rounded-md px-2 font-mono text-xs text-right focus:outline-none focus:border-amber-400"
                                  required
                                />
                              </td>
                              <td className="px-3 py-1.5 border-b border-amber-50 text-right font-semibold font-mono text-amber-900">
                                {formatCurrency(item.quantidade_solicitada * item.preco_unitario)}
                              </td>
                              <td className="px-2 py-1.5 border-b border-amber-50 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="w-9 h-9 inline-flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 transition"
                                  aria-label="Remover item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile — cards compactos */}
                  <div className="flex flex-col gap-2 md:hidden">
                    {itensPedido.map((item, idx) => {
                      const prodRef = store.produtos.find(p => p.id === item.produto_id);
                      return (
                        <div key={idx} className="border border-amber-100 rounded-lg p-2.5 grid grid-cols-2 gap-2 items-center bg-white">
                          <div className="col-span-2">
                            <SelectSearch
                              value={item.produto_id}
                              onChange={(v) => handleUpdateItemRow(idx, { produto_id: v })}
                              options={store.produtos.filter(p => !itensPedido.some((it, i) => i !== idx && it.produto_id && it.produto_id === p.id)).map(p => ({ value: p.id, label: p.nome }))}
                              placeholder="Selecione o produto"
                            />
                          </div>

                          <label className="text-[10px] text-gray-400 font-semibold">Qtd</label>
                          <div className="flex items-center border border-amber-200 rounded-md bg-white">
                            <input type="number" min="1"
                              value={item.quantidade_solicitada}
                              onChange={(e) => handleUpdateItemRow(idx, { quantidade_solicitada: Number(e.target.value) })}
                              {...useSmartArrowKeys(item.quantidade_solicitada, (v) => handleUpdateItemRow(idx, { quantidade_solicitada: v }), 1)}
                              className="w-full h-9 px-2 focus:outline-none font-mono text-xs text-center" required
                            />
                            <span className="bg-amber-100 px-1.5 h-9 flex items-center text-[9px] text-amber-900 font-bold font-mono border-l border-amber-200 rounded-r-md shrink-0">
                              {store.unidadeSigla(prodRef?.unidade_producao_id || 0)}
                            </span>
                          </div>

                          <label className="text-[10px] text-gray-400 font-semibold">R$ Unit.</label>
                          <input type="number" step="0.01" inputMode="decimal"
                            value={item.preco_unitario}
                            onChange={(e) => handleUpdateItemRow(idx, { preco_unitario: Number(e.target.value) })}
                            {...useSmartArrowKeys(item.preco_unitario, (v) => handleUpdateItemRow(idx, { preco_unitario: v }), 0)}
                            className="h-9 border border-amber-200 rounded-md px-2 font-mono text-xs text-right focus:outline-none focus:border-amber-400" required
                          />

                          <div className="flex items-center justify-between col-span-2 pt-1 border-t border-amber-50">
                            <span className="text-[10px] text-gray-400">Total do item</span>
                            <span className="text-xs font-semibold font-mono text-amber-900">{formatCurrency(item.quantidade_solicitada * item.preco_unitario)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="col-span-2 h-9 w-full flex items-center justify-center gap-1.5 rounded-lg text-red-500 border border-red-100 hover:bg-red-50 active:bg-red-100 text-xs font-semibold transition"
                          >
                            <Trash2 size={13} /> Remover item
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </main>

                {/* ── FOOTER FIXO — RESUMO + AÇÕES ──────────────────── */}
                <footer className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-b-2xl">
                  <div className="text-xs text-gray-500">
                    Subtotal <span className="text-gray-900 font-semibold font-mono">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500">Desconto R$</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={descontoValor}
                      onChange={(e) => setDescontoValor(Math.max(0, Number(e.target.value)))}
                      {...useSmartArrowKeys(descontoValor, (v) => setDescontoValor(Math.max(0, v)), 0.01)}
                      className="w-20 h-9 border border-gray-200 rounded-lg px-2 text-xs text-right font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-gray-500">Total</span>
                    <span className="text-sm font-semibold text-gray-900 font-mono">{formatCurrency(totalGeral)}</span>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="h-9 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-sm active:bg-amber-800"
                    >
                      {editingPedidoId ? 'Salvar Alterações' : 'Confirmar Pedido'}
                    </button>
                  </div>
                </footer>
              </form>
            </div>
          </div>
        );
      })()}




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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const printW = window.open('', '_blank');
                        if (!printW) return;
                        const cliNome = cli?.nome || 'N/A';
                        const cliTel = cli?.telefone || '';
                        const cliEnd = cli?.endereco || '';
                        const estStr = estEntrega.toLocaleDateString('pt-BR') + ' às ' + estEntrega.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const now = new Date().toLocaleString('pt-BR');
                        const pagamentos = store.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita');
                        const totalPago = pagamentos.reduce((s, l) => s + l.valor, 0);
                        const saldo = p.valor_total - totalPago;
                        const itensHtml = itens.map((it, idx) => {
                          const prod = store.produtos.find(prd => prd.id === it.produto_id);
                          const bg = idx % 2 === 0 ? '#ffffff' : '#fafaf9';
                          return `<tr>
                            <td style="border-bottom:1px solid #e7e5e4;padding:0.55rem 0.75rem;background:${bg}">${prod?.nome || 'N/A'}${it.observacao ? `<br><span style="font-size:8px;color:#a8a29e">${it.observacao}</span>` : ''}</td>
                            <td style="border-bottom:1px solid #e7e5e4;padding:0.55rem 0.75rem;text-align:center;font-family:monospace;background:${bg}">${it.quantidade_solicitada}</td>
                            <td style="border-bottom:1px solid #e7e5e4;padding:0.55rem 0.75rem;text-align:right;font-family:monospace;background:${bg}">${formatCurrency(it.preco_unitario)}</td>
                            <td style="border-bottom:1px solid #e7e5e4;padding:0.55rem 0.75rem;text-align:right;font-family:monospace;font-weight:600;background:${bg}">${formatCurrency(it.quantidade_solicitada * it.preco_unitario)}</td>
                          </tr>`;
                        }).join('');
                        const obsHtml = p.observacoes ? `<div style="margin-top:1rem;padding:0.75rem 1rem;background:#fefce8;border-left:4px solid #fbbf24;border-radius:0 0.375rem 0.375rem 0;font-size:0.75rem"><strong style="color:#92400e">Observações:</strong><br><span style="color:#57534e">${p.observacoes}</span></div>` : '';
                        const pagHtml = pagamentos.length > 0 ? `
                          <div style="margin-top:1.25rem;padding:0.75rem 1rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.375rem">
                            <p style="margin:0 0 6px 0;font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:1px">Pagamentos</p>
                            ${pagamentos.map(l => `<div style="display:flex;justify-content:space-between;font-size:10px;color:#57534e;padding:2px 0"><span>${l.forma_pagamento || '—'} - ${new Date(l.data_lancamento).toLocaleDateString('pt-BR')}</span><span style="font-family:monospace;font-weight:600;color:#059669">${formatCurrency(l.valor)}</span></div>`).join('')}
                            <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#1c1917;margin-top:6px;padding-top:6px;border-top:1px solid #bbf7d0">
                              <span>Total pago:</span><span style="font-family:monospace;color:#059669">${formatCurrency(totalPago)}</span>
                            </div>
                            ${saldo > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:#dc2626;margin-top:2px"><span>Saldo pendente:</span><span style="font-family:monospace">${formatCurrency(saldo)}</span></div>` : ''}
                          </div>` : '';
                        const logoHtml = getLogoUrl() ? `<img src="${getLogoUrl()}" style="height:40px;width:auto;margin-bottom:0.25rem;display:block" />` : '';
                        printW.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido #${p.id.substring(4).toUpperCase()} - ${getAppName()}</title>
<style>
  @page { margin: 1.8cm 2cm; size: A4 portrait; }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1c1917; font-size: 11px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  hr { border: none; border-top: 2px solid #d97706; margin: 1rem 0; }
  h1, h2, h3, p { margin: 0; }
</style></head><body>

<table style="width:100%;border:none;margin-bottom:1.25rem"><tr>
  <td style="width:55%;vertical-align:top;border:none">
    <table style="border:none;width:100%"><tr>
      ${getLogoUrl() ? `<td style="width:auto;border:none;padding-right:0.35rem;vertical-align:middle"><img src="${getLogoUrl()}" style="max-width:56px;height:auto;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.12)" /></td>` : ''}
      <td style="border:none;vertical-align:middle">
        <div style="display:inline-block;border:2px solid #d97706;padding:0.25rem 0.6rem;border-radius:0.25rem;margin-bottom:0.25rem">
          <h1 style="font-size:16px;font-weight:800;color:#d97706;letter-spacing:1px">${getAppName().toUpperCase()}</h1>
        </div>
        <p style="font-size:9px;color:#a8a29e;letter-spacing:0.5px">${getSlogan()}</p>
      </td>
    </tr></table>
  </td>
  <td style="width:45%;text-align:right;vertical-align:top;border:none">
    <h2 style="font-size:13px;font-weight:600;color:#1c1917;margin-bottom:4px">FICHA TÉCNICA DO PEDIDO</h2>
    <p style="font-size:9px;color:#78716c;font-weight:600">#${p.id.substring(4).toUpperCase()}</p>
    <p style="font-size:8px;color:#a8a29e;margin-top:2px">Pedido: ${new Date(p.data_pedido).toLocaleDateString('pt-BR')}</p>
    <p style="font-size:8px;color:#a8a29e">Impresso: ${now}</p>
  </td>
</tr></table>

<div style="border-bottom:2px solid #d97706;margin-bottom:1.25rem"></div>

<div style="background:linear-gradient(135deg,#fff7ed 0%,#fffbeb 100%);border:1px solid #fde68a;padding:1rem;border-radius:0.5rem;margin-bottom:1rem">
  <table style="width:100%;border:none"><tr>
    <td style="border:none;vertical-align:top;width:65%">
      <p style="font-size:8px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Cliente</p>
      <p style="font-size:14px;font-weight:700;color:#1c1917">${cliNome}</p>
      ${cliEnd ? `<p style="margin-top:4px;font-size:10px;color:#57534e">${cliEnd}</p>` : ''}
      ${cliTel ? `<p style="margin-top:2px;font-size:10px;color:#57534e">Tel: ${cliTel}</p>` : ''}
    </td>
    <td style="border:none;vertical-align:top;text-align:right;width:35%">
      <p style="font-size:8px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Entrega</p>
      <p style="font-size:11px;font-weight:600;color:#1c1917;font-family:monospace">${estStr}</p>
    </td>
  </tr></table>
</div>

${obsHtml}

<table style="margin-top:1rem">
  <thead><tr>
    <th style="background:#292524;color:white;padding:0.55rem 0.75rem;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:none">Produto</th>
    <th style="background:#292524;color:white;padding:0.55rem 0.75rem;text-align:center;font-size:8px;text-transform:uppercase;letter-spacing:0.5px">Qtd</th>
    <th style="background:#292524;color:white;padding:0.55rem 0.75rem;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.5px">Preço Unit.</th>
    <th style="background:#292524;color:white;padding:0.55rem 0.75rem;text-align:right;font-size:8px;text-transform:uppercase;letter-spacing:0.5px">Subtotal</th>
  </tr></thead>
  <tbody>${itensHtml}</tbody>
  <tfoot><tr>
    <td colspan="3" style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-weight:700;color:#1c1917;font-size:11px">TOTAL GERAL</td>
    <td style="border-top:2px solid #d97706;padding:0.625rem 0.75rem;text-align:right;font-family:monospace;font-weight:800;color:#d97706;font-size:13px">${formatCurrency(p.valor_total)}</td>
  </tr></tfoot>
</table>

${pagHtml}

<div style="margin-top:2.5rem;padding-top:1.5rem;border-top:2px solid #e7e5e4">
  <table style="width:100%;border:none"><tr>
    <td style="width:45%;border:none;text-align:center">
      <p style="margin-bottom:0.5rem;font-size:9px;color:#a8a29e">________________________________</p>
      <p style="font-size:10px;font-weight:600;color:#57534e">Assinatura do Cliente</p>
    </td>
    <td style="width:10%;border:none"></td>
    <td style="width:45%;border:none;text-align:center">
      <p style="margin-bottom:0.5rem;font-size:9px;color:#a8a29e">________________________________</p>
      <p style="font-size:10px;font-weight:600;color:#57534e">Assinatura do Responsável</p>
    </td>
  </tr></table>
</div>

<div style="margin-top:1.5rem;text-align:center;font-size:7px;color:#d6d3d1">
  ${getAppName()} — ${getSlogan()} | ${now}
</div>

</body></html>`);
                        printW.document.close();
                        printW.print();
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 border border-amber-200 hover:border-amber-700 transition"
                      title="Imprimir Ficha"
                    >
                      <Printer size={15} /> Imprimir
                    </button>
                    <button onClick={() => setSelectedPedidoId(null)} className="text-gray-450 hover:text-amber-950 p-1">
                      <X size={20} />
                    </button>
                  </div>
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
                    <p className="font-display font-semibold text-amber-900 uppercase tracking-wider text-[10px] border-b border-amber-100 pb-1">Itens do Pedido</p>
                    <div className="space-y-2">
                      {itens.map((it, idx) => {
                        const prod = store.produtos.find(prd => prd.id === it.produto_id);
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-orange-50/10 border border-amber-100/50 text-[11px]">
                            <div className="grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5 font-semibold text-amber-950 truncate">{prod?.nome || '—'}</div>
                              <div className="col-span-2 text-center font-mono text-amber-900">{it.quantidade_solicitada} {store.unidadeSigla(prod?.unidade_producao_id || 0)}</div>
                              <div className="col-span-2 text-right font-mono text-gray-500">{formatCurrency(it.preco_unitario)}</div>
                              <div className="col-span-3 text-right font-bold font-mono text-amber-900">{formatCurrency(it.quantidade_solicitada * it.preco_unitario)}</div>
                            </div>
                            {it.observacao && <p className="text-[9px] text-gray-400 mt-1 ml-0.5">{it.observacao}</p>}
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
                    <div className="grid grid-cols-2 gap-2">
                      {store.hasPermission('pedidos.editar') && (p.status_id === 1 || p.status_id === 2) && (
                        <button
                          onClick={() => handleOpenEditOrder(p.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          ✏️ Editar Pedido
                        </button>
                      )}

                      {store.hasPermission('pedidos.aprovar') && p.status_id === 1 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 2)}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          ✔️ Confirmar Encomenda
                        </button>
                      )}
                      
                      {store.hasPermission('pedidos.editar') && p.status_id === 2 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 3)}
                          disabled={!analise.tudoDisponivelEmEstoquePronto && !analise.podeProduzirRestante}
                          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          🥘 Iniciar Produção
                        </button>
                      )}

                      {store.hasPermission('pedidos.editar') && p.status_id === 2 && analise.tudoDisponivelEmEstoquePronto && (
                        <button
                          onClick={async () => {
                            const result = await store.atenderPedidoDoEstoque(p.id);
                            if (!result.success) { setCustomAlert({ title: 'Erro', message: result.error || 'Erro ao entregar do estoque' }); return; }
                            onUpdate();
                          }}
                          className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          🚚 Entregar do Estoque
                        </button>
                      )}

                      {store.hasPermission('pedidos.editar') && p.status_id === 3 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 4)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          🍳 Finalizar e Gerar Estoque
                        </button>
                      )}

                      {store.hasPermission('pedidos.editar') && p.status_id === 4 && (
                        <button
                          onClick={() => handleTransitionStatus(p.id, 5)}
                          className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          🚚 Entregar
                        </button>
                      )}

                      {store.hasPermission('pedidos.cancelar') && p.status_id !== 5 && p.status_id !== 6 && (
                        <button
                          onClick={() => setReverseConfirm({ pedidoId: p.id, targetStatus: 6, fromStatus: p.status_id })}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px]"
                        >
                          ❌ Cancelar Pedido
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
                          {store.getEstornoPendente().some(e => e.id === p.id) && (
                            <button
                              onClick={() => setEstornoConfirm(p.id)}
                              className="w-full mt-3 py-2 px-3 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold rounded-xl text-[10px] border border-orange-200 flex items-center justify-center gap-1"
                            >
                              🔄 Estornar agora
                            </button>
                          )}
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

      {/* Reverse confirmation modal (voltar/cancelar pedido) */}
      {reverseConfirm && (() => {
        const { pedidoId, targetStatus, fromStatus } = reverseConfirm;
        const ped = store.pedidos.find(p => p.id === pedidoId);
        if (!ped) return null;
        const recebidos = store.lancamentos.filter(l => l.pedido_id === pedidoId && l.tipo === 'receita');
        const totalRecebido = recebidos.reduce((s, l) => s + l.valor, 0);
        const isCancel = targetStatus === 6;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-sm w-full p-6 space-y-4 border border-amber-100 dark:border-[#2e1a0a]">
              <h3 className="font-bold text-amber-950 dark:text-amber-50">
                {isCancel ? 'Cancelar Pedido' : 'Voltar Pedido'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-amber-100/70">
                {isCancel
                  ? `Tem certeza que deseja cancelar o pedido #${ped.id.slice(-6)}?`
                  : `Deseja voltar o pedido #${ped.id.slice(-6)} para "${store.statusNome(targetStatus)}"?`}
              </p>

              {/* Checkboxes conforme fromStatus */}
              <div className="space-y-2">
                {fromStatus === 4 && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-amber-200 cursor-pointer">
                    <input type="checkbox" checked={revReverterProducao}
                      onChange={e => {
                        setRevReverterProducao(e.target.checked);
                        setRevRestaurarInsumos(e.target.checked);
                        setRevRemoverProdutos(e.target.checked);
                      }}
                      className="rounded border-gray-300 dark:border-[#2e1a0a] text-amber-600 focus:ring-amber-500" />
                    Reverter produção (restaura insumos + remove estoque gerado)
                  </label>
                )}
                {fromStatus === 5 && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-amber-200 cursor-pointer">
                      <input type="checkbox" checked={revReporEstoque} onChange={e => setRevReporEstoque(e.target.checked)}
                        className="rounded border-gray-300 dark:border-[#2e1a0a] text-amber-600 focus:ring-amber-500" />
                      Repor produtos entregues (devolve ao estoque)
                    </label>
                    {totalRecebido > 0 && (
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-amber-200 cursor-pointer">
                        <input type="checkbox" checked={revEstornar} onChange={e => setRevEstornar(e.target.checked)}
                          className="rounded border-gray-300 dark:border-[#2e1a0a] text-amber-600 focus:ring-amber-500" />
                        Estornar pagamentos ({formatCurrency(totalRecebido)})
                      </label>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setReverseConfirm(null); setRevReverterProducao(true); setRevRestaurarInsumos(true); setRevRemoverProdutos(true); setRevReporEstoque(true); setRevEstornar(false); }}
                  className="flex-1 py-2 px-3 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-xs font-medium text-gray-600 dark:text-amber-100 hover:bg-gray-50 dark:hover:bg-[#130b04]">
                  Voltar
                </button>
                <button onClick={async () => {
                  let errMsg: string | null = null;
                  try {
                    const isVoltar5to4 = fromStatus === 5 && targetStatus !== 6;
                    const restaurarInsumos = isVoltar5to4 ? false : revRestaurarInsumos;
                    const removerProdutos = isVoltar5to4 ? false : revRemoverProdutos;
                    const reporEstoque = fromStatus === 5 ? revReporEstoque : false;
                    if (restaurarInsumos || removerProdutos || reporEstoque) {
                      const revResult = await store.reverterMovimentacoesPedido(pedidoId, { restaurarInsumos, removerProdutos, reporEstoque });
                      if (!revResult.success) { errMsg = revResult.error || 'Erro ao reverter movimentações'; return; }
                    }
                    const statusResult = await store.updatePedidoStatus(pedidoId, targetStatus);
                    if (!statusResult.success) { errMsg = statusResult.error || 'Erro desconhecido'; return; }
                    if (revEstornar) {
                      await store.estornarPagamentosPedido(pedidoId);
                    }
                  } catch (e) {
                    errMsg = e instanceof Error ? e.message : 'Erro inesperado';
                  } finally {
                    setReverseConfirm(null);
                    setRevReverterProducao(true); setRevRestaurarInsumos(true); setRevRemoverProdutos(true); setRevReporEstoque(true); setRevEstornar(false);
                    if (errMsg) setCustomAlert({ title: 'Erro na operação', message: errMsg });
                    onUpdate();
                  }
                }}
                  className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold">
                  {isCancel ? 'Confirmar Cancelamento' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete pedido confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Excluir Pedido?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              O pedido <strong>#{deleteConfirm.slice(-6)}</strong> será excluído permanentemente. As reservas físicas de estoque também serão desfeitas.
            </p>
            <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={async () => {
                const result = await store.deletePedido(deleteConfirm);
                if (!result.success) { setCustomAlert({ title: 'Erro ao excluir', message: result.error || 'Erro desconhecido' }); return; }
                setDeleteConfirm(null); onUpdate();
              }}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estorno confirmation modal */}
      {estornoConfirm && (() => {
        const ped = store.pedidos.find(p => p.id === estornoConfirm);
        if (!ped) return null;
        const recebidos = store.lancamentos.filter(l => l.pedido_id === estornoConfirm && l.tipo === 'receita');
        const totalRecebido = recebidos.reduce((s, l) => s + l.valor, 0);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Estornar Pagamentos?</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
                Os pagamentos do pedido <strong>#{ped.id.slice(-6)}</strong> serão estornados como despesas na categoria <strong>Estorno</strong>.
              </p>
              {totalRecebido > 0 && (
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
                  Valor total a estornar: <strong>{formatCurrency(totalRecebido)}</strong>
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta operação criará lançamentos de despesa no financeiro.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEstornoConfirm(null)}
                  className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                  Cancelar
                </button>
                <button onClick={async () => { await store.estornarPagamentosPedido(estornoConfirm); setEstornoConfirm(null); onUpdate(); }}
                  className="flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl transition">
                  Confirmar Estorno
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Estoque Insuficiente modal */}
      {insufficientItemsEdit && (() => {
        const { items } = insufficientItemsEdit;
        const allResolved = items.every(i => (i.pedidoQtd - i.estoqueQtd) <= 0);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-lg w-full p-6 border border-amber-100 dark:border-[#2e1a0a] space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Estoque Insuficiente</h3>
                  <p className="text-xs text-gray-500 dark:text-amber-100/50">Ajuste o pedido ou o estoque para continuar</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-amber-100/40">
                      <th className="pb-2 pr-2 font-semibold">Produto</th>
                      <th className="pb-2 px-2 font-semibold text-center">Pedido</th>
                      <th className="pb-2 px-2 font-semibold text-center">Estoque</th>
                      <th className="pb-2 pl-2 font-semibold text-center">Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const dif = item.pedidoQtd - item.estoqueQtd;
                      const resolved = dif <= 0;
                      return (
                        <tr key={item.produtoId} className={`border-t border-amber-50 dark:border-[#22160b]/50 ${resolved ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}>
                          <td className="py-2 pr-2 font-medium text-amber-900 dark:text-amber-200">{item.produtoNome}</td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" min="0" value={item.pedidoQtd}
                              onChange={e => handleInsufficientItemChange(idx, 'pedidoQtd', Number(e.target.value))}
                              className="w-16 text-center bg-transparent border border-gray-200 dark:border-[#2e1a0a] rounded-lg py-1 text-xs font-mono text-amber-900 dark:text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input type="number" min="0" value={item.estoqueQtd}
                              onChange={e => handleInsufficientItemChange(idx, 'estoqueQtd', Number(e.target.value))}
                              className="w-16 text-center bg-transparent border border-gray-200 dark:border-[#2e1a0a] rounded-lg py-1 text-xs font-mono text-amber-900 dark:text-amber-100 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                          </td>
                          <td className="py-2 pl-2 text-center">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold ${resolved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {dif > 0 ? `+${dif}` : dif}
                              {resolved && <CheckCircle size={14} />}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setInsufficientItemsEdit(null)}
                  className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                  Cancelar
                </button>
                <button onClick={handleInsufficientConfirm}
                  disabled={!allResolved}
                  className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 dark:disabled:bg-[#2e1a0a] disabled:cursor-not-allowed text-white font-semibold rounded-xl transition">
                  {allResolved ? 'Confirmar' : 'Resolva os itens acima'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <RelatorioPedidos store={store} isOpen={relatorioOpen} onClose={() => setRelatorioOpen(false)} />

      {/* Custom alert modal (replaces native browser alert) */}
      {customAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">{customAlert.title || 'Atenção'}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              {customAlert.message}
            </p>
            <div className="flex justify-end pt-2">
              <button onClick={() => setCustomAlert(null)}
                className="py-2 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


