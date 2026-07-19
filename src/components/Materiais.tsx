import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Material } from '../types';
import { useSmartArrowKeys } from '../lib/hooks/useSmartArrowKeys';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import SelectSearch from './SelectSearch';
import ConfirmarLimpezaHistorico from './ConfirmarLimpezaHistorico';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Warehouse, 
  History, 
  DollarSign, 
  AlertTriangle,
  FileCheck,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  PackageOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Settings,
  Coins
} from 'lucide-react';

interface MateriaisProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Materiais({ store, onUpdate }: MateriaisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'em_falta' | 'critico' | 'com_estoque'>('todos');
  const [activeTab, setActiveTab] = useState<'lista' | 'historico'>('lista');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [unidadeId, setUnidadeId] = useState<number>(1);
  const [quantidadeAtual, setQuantidadeAtual] = useState<number>(0);
  const [quantidadeMinima, setQuantidadeMinima] = useState<number>(0);
  const [custoUnitario, setCustoUnitario] = useState<number>(0);
  const [fornecedorId, setFornecedorId] = useState<number>(0);

  // Quick-add fornecedor
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState('');
  const [novoFornecedorContato, setNovoFornecedorContato] = useState('');
  const [novoFornecedorTel, setNovoFornecedorTel] = useState('');
  const [novoFornecedorEmail, setNovoFornecedorEmail] = useState('');
  const [savingFornecedor, setSavingFornecedor] = useState(false);

  // Quick-add unidade
  const [showNovaUnidade, setShowNovaUnidade] = useState(false);
  const [novaUnidadeNome, setNovaUnidadeNome] = useState('');
  const [novaUnidadeSigla, setNovaUnidadeSigla] = useState('');
  const [novaUnidadeTipo, setNovaUnidadeTipo] = useState<'massa' | 'volume' | 'unidade'>('massa');
  const [savingUnidade, setSavingUnidade] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // History tab states
  const [histSearch, setHistSearch] = useState('');
  const [histTipoFilter, setHistTipoFilter] = useState(0);
  const [histDataInicio, setHistDataInicio] = useState('');
  const [histDataFim, setHistDataFim] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(10);
  const [histSelected, setHistSelected] = useState<Set<string>>(new Set());
  const [showLimparConfirm, setShowLimparConfirm] = useState(false);

  // Quick Inbound replenishment state
  const [isInbounding, setIsInbounding] = useState(false);
  const [inboundMaterialId, setInboundMaterialId] = useState<string>('');
  const [inboundQtd, setInboundQtd] = useState<number>(1);
  const [inboundCustoUnitario, setInboundCustoUnitario] = useState<number>(0);
  const [inboundObs, setInboundObs] = useState<string>('');
  const [inboundCriarDespesa, setInboundCriarDespesa] = useState(false);
  const [inboundFormaPagamento, setInboundFormaPagamento] = useState<string>('');

  const opcoesPagamento = ['Pix', 'Dinheiro', 'Crédito', 'Débito', 'Boleto', 'Outros'];

  // Filter materials list
  const filteredMateriais = (() => {
    return store.materiais.filter(m => {
      const batchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterType === 'em_falta') {
        return batchesSearch && m.quantidade_atual === 0;
      }
      if (filterType === 'critico') {
        return batchesSearch && m.quantidade_atual < m.quantidade_minima && m.quantidade_atual > 0;
      }
      if (filterType === 'com_estoque') {
        return batchesSearch && m.quantidade_atual > 0;
      }
      return batchesSearch;
    });
  })();

  const { sortedItems: sortedMateriais, requestSort, sortConfig } = useSortableData(filteredMateriais, 'nome');

  // History filtered list
  const histFiltered = useMemo(() => {
    return store.movMateriais.filter(m => {
      const mat = store.materiais.find(ma => ma.id === m.material_id);
      const nome = mat?.nome || '';
      if (histSearch) {
        const searchLow = histSearch.toLowerCase();
        if (!nome.toLowerCase().includes(searchLow) && !(m.observacao || '').toLowerCase().includes(searchLow)) return false;
      }
      if (histTipoFilter && m.tipo_id !== histTipoFilter) return false;
      if (histDataInicio && new Date(m.criado_em) < new Date(histDataInicio)) return false;
      if (histDataFim) {
        const fim = new Date(histDataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(m.criado_em) > fim) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [store.movMateriais, store.materiais, histSearch, histTipoFilter, histDataInicio, histDataFim]);

  const histTotalPages = Math.max(1, Math.ceil(histFiltered.length / histPageSize));
  const histPaginated = histFiltered.slice(
    (histPage - 1) * histPageSize,
    histPage * histPageSize
  );

  const allHistSelected = histPaginated.length > 0 && histPaginated.every(m => histSelected.has(m.id));

  const toggleHistSelectAll = () => {
    if (allHistSelected) {
      setHistSelected(new Set());
    } else {
      setHistSelected(new Set(histPaginated.map(m => m.id) as string[]));
    }
  };

  const toggleHistSelect = (id: string) => {
    setHistSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLimparSelecionados = async () => {
    const ids = Array.from(histSelected) as string[];
    const result = await store.deleteMovimentacoes(ids, 'material');
    if (result.success) {
      setHistSelected(new Set());
      setShowLimparConfirm(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(sortedMateriais.length / pageSize));
  const paginatedMateriais = sortedMateriais.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (v: string) => {
    setSearchTerm(v);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: 'todos' | 'em_falta' | 'critico' | 'com_estoque') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleOpenNew = () => {
    setIsEditing(true);
    setEditId(null);
    setNome('');
    setUnidadeId(1);
    setQuantidadeAtual(0);
    setQuantidadeMinima(0);
    setCustoUnitario(0);
    setFornecedorId(0);
  };

  const handleOpenEdit = (m: Material) => {
    setIsEditing(true);
    setEditId(m.id);
    setNome(m.nome);
    setUnidadeId(m.unidade_id);
    setQuantidadeAtual(m.quantidade_atual);
    setQuantidadeMinima(m.quantidade_minima);
    setCustoUnitario(m.custo_unitario);
    setFornecedorId(m.fornecedor_id || 0);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Favor preencher o nome do ingrediente.');
      return;
    }

    if (editId) {
      await store.updateMaterial(editId, {
        nome,
        unidade_id: unidadeId,
        quantidade_atual: Number(quantidadeAtual),
        quantidade_minima: Number(quantidadeMinima),
        custo_unitario: Number(custoUnitario),
        fornecedor_id: fornecedorId || undefined
      });
    } else {
      await store.addMaterial({
        nome,
        unidade_id: unidadeId,
        quantidade_atual: Number(quantidadeAtual),
        quantidade_minima: Number(quantidadeMinima),
        custo_unitario: Number(custoUnitario),
        fornecedor_id: fornecedorId || undefined
      });
    }

    setIsEditing(false);
    onUpdate();
  };

  // Stock Inbound purchase helper
  const handleOpenInbound = (m: Material) => {
    setInboundMaterialId(m.id);
    setInboundQtd(1);
    setInboundCustoUnitario(m.custo_unitario);
    setInboundObs('');
    setInboundCriarDespesa(true);
    setIsInbounding(true);
  };

  const handleCriarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedorNome.trim()) return;
    setSavingFornecedor(true);
    const f = await store.addFornecedor({
      nome_fantasia: novoFornecedorNome.trim(),
      contato: novoFornecedorContato.trim() || undefined,
      telefone: novoFornecedorTel.trim() || undefined,
      email: novoFornecedorEmail.trim() || undefined,
    });
    setSavingFornecedor(false);
    if (f) {
      setFornecedorId(f.id);
      setShowNovoFornecedor(false);
      setNovoFornecedorNome('');
      setNovoFornecedorContato('');
      setNovoFornecedorTel('');
      setNovoFornecedorEmail('');
    }
  };

  const handleCriarUnidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUnidadeNome.trim() || !novaUnidadeSigla.trim()) return;
    setSavingUnidade(true);
    const u = await store.addUnidade({
      nome: novaUnidadeNome.trim(),
      sigla: novaUnidadeSigla.trim().toLowerCase(),
      tipo: novaUnidadeTipo,
    });
    setSavingUnidade(false);
    if (u) {
      setUnidadeId(u.id);
      setShowNovaUnidade(false);
      setNovaUnidadeNome('');
      setNovaUnidadeSigla('');
      setNovaUnidadeTipo('massa');
      onUpdate();
    }
  };

  const handleSaveInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inboundQtd <= 0) {
      alert('A quantidade deve ser maior do que zero.');
      return;
    }
    if (inboundCustoUnitario < 0) {
      alert('O custo unitário não pode ser menor do que zero.');
      return;
    }
    await store.lancarEntradaMaterial(inboundMaterialId, Number(inboundQtd), Number(inboundCustoUnitario), inboundObs, inboundCriarDespesa, inboundFormaPagamento);
    setIsInbounding(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-amber-700 dark:text-amber-400" />
            <h1 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Insumos</h1>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50 mt-1">Gerencie os ingredientes, compre insumos, controle custos e resolva alertas de reestoque.</p>
        </div>

        {store.hasPermission('materiais.criar') && (
          <button 
            onClick={handleOpenNew}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-750 dark:hover:bg-emerald-700 shadow-sm text-white text-xs font-semibold font-sans py-2 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center cursor-pointer"
          >
            <Plus size={15} /> Novo Ingrediente
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-amber-100 dark:border-[#22160b] gap-4" id="materiais-nav">
        <button 
          onClick={() => setActiveTab('lista')}
          className={`py-2 px-3 text-xs font-semibold uppercase tracking-wider font-sans transition cursor-pointer rounded-t-xl ${
            activeTab === 'lista' 
              ? 'border-b-2 border-amber-700 dark:border-amber-400 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold' 
              : 'text-gray-500 dark:text-[#a08f80] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-950 dark:hover:text-amber-200'
          }`}
        >
          Estoque de Insumos
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`py-2 px-3 text-xs font-semibold uppercase tracking-wider font-sans transition cursor-pointer rounded-t-xl ${
            activeTab === 'historico' 
              ? 'border-b-2 border-amber-700 dark:border-amber-400 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold' 
              : 'text-gray-500 dark:text-[#a08f80] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-950 dark:hover:text-amber-200'
          }`}
        >
          Movimentações
        </button>
      </div>

      {activeTab === 'lista' ? (
        <>
          {/* Controls Bar */}
          <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search input with search icon */}
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar ingrediente ou fornecedor..." 
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-orange-950/10 border border-amber-100 dark:border-[#22160b] focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 text-amber-950 dark:text-amber-100 transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
              {[
                { type: 'todos' as const, label: 'Todos' },
                { type: 'em_falta' as const, label: 'Em Falta' },
                { type: 'critico' as const, label: 'Crítico' },
                { type: 'com_estoque' as const, label: 'Com Estoque' }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleFilterChange(item.type)}
                  className={`px-3 py-1 rounded-full text-[10px] tracking-wide font-semibold border transition whitespace-nowrap cursor-pointer ${
                    filterType === item.type 
                      ? 'bg-amber-800 dark:bg-amber-700 text-white border-amber-800' 
                      : 'bg-white dark:bg-[#1c140c] text-gray-500 dark:text-amber-200/50 border-amber-100 dark:border-[#2d1e0d] hover:bg-amber-50 dark:hover:bg-amber-955'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table / Cards List */}
          {sortedMateriais.length === 0 ? (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500">
              <PackageOpen size={36} className="mx-auto text-amber-600/30 mb-2" />
              <p className="text-sm font-medium text-amber-900/85 dark:text-amber-100/80">Nenhum ingrediente corresponde aos filtros.</p>
              <p className="text-xs text-gray-400 dark:text-amber-100/30 mt-1">Altere sua busca ou cadastre um ingrediente acima.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop view (Tables) */}
              <div className="hidden md:block bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-medium text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                      <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Ingrediente" sortKey="nome" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th className="p-3 text-right whitespace-nowrap"><SortButton label="Estoque Atual" sortKey="quantidade_atual" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                      <th className="p-3 text-right whitespace-nowrap"><SortButton label="Mínimo Crítico" sortKey="quantidade_minima" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                      <th className="p-3 text-right whitespace-nowrap"><SortButton label="Preço Unitário" sortKey="custo_unitario" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                      <th className="p-3 text-right whitespace-nowrap">Preço Total</th>
                      <th className="p-3 whitespace-nowrap"><SortButton label="Última Atualização" sortKey="data_ultima_atualizacao" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMateriais.map(m => {
                      const isAbatido = m.quantidade_atual < m.quantidade_minima;
                      return (
                        <tr key={m.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                          <td className="p-3 pl-4 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{m.nome}</td>
                          <td className="p-3 text-right font-mono whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold
                              ${isAbatido ? 'bg-red-100 dark:bg-red-950/25 text-red-700 dark:text-red-350 animate-pulse' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'}
                            `}>
                              {m.quantidade_atual} {store.unidadeSigla(m.unidade_id)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">{m.quantidade_minima} {store.unidadeSigla(m.unidade_id)}</td>
                          <td className="p-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">{m.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 6 })} <span className="text-[10px] text-gray-400 dark:text-amber-100/30">/{store.unidadeSigla(m.unidade_id)}</span></td>
                          <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/50 whitespace-nowrap">{(m.custo_unitario * m.quantidade_atual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="p-3 text-gray-400 dark:text-amber-100/30 whitespace-nowrap">{new Date(m.data_ultima_atualizacao).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {store.hasPermission('materiais.editar') && (
                                <button 
                                  onClick={() => handleOpenInbound(m)}
                                  className="bg-emerald-50 dark:bg-[#152e18] hover:bg-emerald-100 dark:hover:bg-[#1d4221] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-[#1d4022] rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                  data-help="materiais-mov"
                                >
                                  + Compra/Entrada
                                </button>
                              )}
                              {store.hasPermission('materiais.editar') && (
                                <button 
                                  onClick={() => handleOpenEdit(m)}
                                  className="hover:bg-amber-100 dark:hover:bg-amber-950 p-1.5 rounded-lg text-amber-900 dark:text-amber-200 transition cursor-pointer"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}
                              {store.hasPermission('materiais.excluir') && (
                                <button 
                                  onClick={() => setDeleteConfirm({ id: m.id, name: m.nome })}
                                  className="hover:bg-red-100 dark:hover:bg-red-950/30 p-1.5 rounded-lg text-red-650 dark:text-red-400 transition cursor-pointer"
                                >
                                  <Trash2 size={14} />
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

              {/* Mobile View (Touch Cards) */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {paginatedMateriais.map(m => {
                  const isAbatido = m.quantidade_atual < m.quantidade_minima;
                  return (
                    <div key={m.id} className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-amber-950 dark:text-amber-100 text-sm font-display">{m.nome}</h4>
                          <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5 font-sans">{(m.custo_unitario * m.quantidade_atual).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} total</p>
                        </div>
                        {isAbatido && (
                          <span className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-350 text-[9px] px-2 py-0.5 rounded-full border border-red-100 dark:border-red-950/20 font-bold flex items-center gap-0.5 font-sans">
                            <AlertTriangle size={10} /> CRÍTICO
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-amber-50/30 dark:bg-amber-950/15 p-2 rounded-lg text-center font-sans">
                        <div>
                          <p className="text-[9px] text-gray-500 dark:text-amber-150/40 uppercase font-medium">Estoque</p>
                          <p className={`font-mono font-bold text-xs mt-0.5 ${isAbatido ? 'text-red-650' : 'text-amber-950 dark:text-amber-100'}`}>
                            {m.quantidade_atual} {store.unidadeSigla(m.unidade_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 dark:text-amber-150/40 uppercase font-medium">Mínimo</p>
                          <p className="font-mono text-gray-600 dark:text-amber-200 text-xs mt-0.5">{m.quantidade_minima} {store.unidadeSigla(m.unidade_id)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 dark:text-amber-150/40 uppercase font-medium">Custo Unit.</p>
                          <p className="font-mono text-emerald-700 dark:text-emerald-400 text-xs font-bold mt-0.5">{m.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 6 })}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-50 dark:border-[#22160b]">
                        {store.hasPermission('materiais.editar') && (
                          <button 
                            onClick={() => handleOpenInbound(m)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-750 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg text-center cursor-pointer font-sans"
                          >
                            + Entrada/Compra
                          </button>
                        )}
                        {store.hasPermission('materiais.editar') && (
                          <button 
                            onClick={() => handleOpenEdit(m)}
                            className="bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-100 p-1.5 rounded-lg text-xs font-sans cursor-pointer"
                          >
                            Editar
                          </button>
                        )}
                        {store.hasPermission('materiais.excluir') && (
                          <button 
                            onClick={() => setDeleteConfirm({ id: m.id, name: m.nome })}
                            className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-650 dark:text-red-300 p-1.5 rounded-lg text-xs font-sans cursor-pointer"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-3 py-2 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  <span className="text-xs text-gray-500 dark:text-amber-100/50 font-mono">
                    Pág. {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100"
                  >
                    Próximo <ChevronRight size={14} />
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="ml-2 px-2 py-1.5 rounded-lg text-xs font-semibold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 cursor-pointer focus:outline-none"
                  >
                    <option value={6}>6 / pág</option>
                    <option value={10}>10 / pág</option>
                    <option value={20}>20 / pág</option>
                    <option value={50}>50 / pág</option>
                  </select>
                </div>
            </div>
          )}
        </>
      ) : (
        /* History of Inventory Movements Tab */
        <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-amber-950 dark:text-amber-100 text-base">Registro de Entradas e Saídas</h3>
            <div className="flex items-center gap-2">
              {histSelected.size > 0 && store.hasPermission('estoque.limpar_historico') && (
                <button
                  onClick={() => setShowLimparConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={12} /> Excluir {histSelected.size} selecionado(s)
                </button>
              )}
              <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-[#382613] font-bold px-2 py-0.5 rounded font-mono">
                {histFiltered.length} registros
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={histSearch}
                onChange={e => { setHistSearch(e.target.value); setHistPage(1); setHistSelected(new Set()); }}
                placeholder="Buscar ingrediente ou observação..."
                className="w-full pl-7 pr-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400"
              />
            </div>
            <SelectSearch value={String(histTipoFilter)} onChange={v => { setHistTipoFilter(Number(v)); setHistPage(1); setHistSelected(new Set()); }} options={[{ value: '0', label: 'Todos os tipos' }, ...store.tiposMovimentacao.filter(t => t.entidade === 'material' || t.entidade === 'ambos').map(t => ({ value: String(t.id), label: t.nome }))]} placeholder="Filtrar por tipo" />
            <input
              type="date"
              value={histDataInicio}
              onChange={e => { setHistDataInicio(e.target.value); setHistPage(1); setHistSelected(new Set()); }}
              className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none"
              placeholder="Data início"
            />
            <input
              type="date"
              value={histDataFim}
              onChange={e => { setHistDataFim(e.target.value); setHistPage(1); setHistSelected(new Set()); }}
              className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none"
              placeholder="Data fim"
            />
          </div>

          {histFiltered.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-amber-100/30 py-8 text-xs font-sans">Nenhuma movimentação encontrada para os filtros atuais.</p>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                      {store.hasPermission('estoque.limpar_historico') && (
                        <th className="p-3 pl-4 w-8">
                          <input
                            type="checkbox"
                            checked={allHistSelected}
                            onChange={toggleHistSelectAll}
                            className="rounded border-amber-300 dark:border-amber-950/40 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                      )}
                      <th className="p-3 whitespace-nowrap font-semibold">Data</th>
                      <th className="p-3 whitespace-nowrap font-semibold">Ingrediente</th>
                      <th className="p-3 whitespace-nowrap font-semibold">Tipo</th>
                      <th className="p-3 text-right whitespace-nowrap font-semibold">Quantidade</th>
                      <th className="p-3 text-right whitespace-nowrap font-semibold">Custo</th>
                      <th className="p-3 whitespace-nowrap font-semibold">Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histPaginated.map(mov => {
                      const mat = store.materiais.find(m => m.id === mov.material_id);
                      const tipo = store.tiposMovimentacao.find(t => t.id === mov.tipo_id);
                      const isEntrada = tipo?.natureza === 'entrada';
                      const dateObj = mov.criado_em ? new Date(mov.criado_em) : null;
                      const isDateValid = dateObj && !isNaN(dateObj.getTime());
                      const valPago = (mov.valor_pago ?? mov.custo_unitario ?? mat?.custo_unitario ?? 0) * mov.quantidade;

                      return (
                        <tr key={mov.id} className={`border-b border-amber-50/50 dark:border-[#22160b]/40 transition ${histSelected.has(mov.id) ? 'bg-amber-100/30 dark:bg-amber-950/20' : 'hover:bg-amber-50/20 dark:hover:bg-amber-950/10'}`}>
                          {store.hasPermission('estoque.limpar_historico') && (
                            <td className="p-3 pl-4">
                              <input
                                type="checkbox"
                                checked={histSelected.has(mov.id)}
                                onChange={() => toggleHistSelect(mov.id)}
                                className="rounded border-amber-300 dark:border-amber-950/40 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-3 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                            {isDateValid ? dateObj.toLocaleDateString('pt-BR') + ' ' + dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{mat?.nome || 'Ingrediente Desconhecido'}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              isEntrada
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}>
                              {isEntrada ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                              {tipo?.nome || '—'}
                            </span>
                          </td>
                          <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${isEntrada ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                            {isEntrada ? '+' : '-'}{mov.quantidade} {store.unidadeSigla(mat?.unidade_id || 0) || ''}
                          </td>
                          <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                            {isEntrada ? valPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </td>
                          <td className="p-3 text-gray-500 dark:text-amber-100/40 whitespace-nowrap max-w-[200px] truncate">{mov.observacao || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2">
                {histPaginated.map(mov => {
                  const mat = store.materiais.find(m => m.id === mov.material_id);
                  const tipo = store.tiposMovimentacao.find(t => t.id === mov.tipo_id);
                  const isEntrada = tipo?.natureza === 'entrada';
                  const dateObj = mov.criado_em ? new Date(mov.criado_em) : null;
                  const isDateValid = dateObj && !isNaN(dateObj.getTime());

                  return (
                    <div key={mov.id} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${histSelected.has(mov.id) ? 'bg-amber-100/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' : 'bg-amber-50/10 dark:bg-[#1d160e]/30 border-amber-50 dark:border-[#2d1e0d]'}`}>
                      <div className="flex items-center gap-3">
                        {store.hasPermission('estoque.limpar_historico') && (
                          <input
                            type="checkbox"
                            checked={histSelected.has(mov.id)}
                            onChange={() => toggleHistSelect(mov.id)}
                            className="rounded border-amber-300 dark:border-amber-950/40 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        )}
                        <div className={`p-1.5 rounded-lg ${isEntrada ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'}`}>
                          {isEntrada ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="font-semibold text-amber-950 dark:text-amber-150">{mat?.nome || 'Ingrediente Desconhecido'}</p>
                          <p className="text-gray-500 dark:text-amber-100/40 text-[10px] mt-0.5 font-sans">{mov.observacao}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold font-mono ${isEntrada ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                          {isEntrada ? '+' : '-'}{mov.quantidade}{store.unidadeSigla(mat?.unidade_id || 0) || ''}
                        </p>
                        {isDateValid && (
                          <p className="text-[10px] text-gray-400 dark:text-amber-100/30 mt-0.5">
                            {dateObj.toLocaleDateString('pt-BR')} {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {histFiltered.length > histPageSize && (
                <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-[#22160b]">
                  <div className="text-[10px] text-gray-500 dark:text-amber-100/40">
                    {histFiltered.length} registros — Pág. {histPage} de {histTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setHistPage(p => Math.max(1, p - 1))} disabled={histPage === 1}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-900 dark:text-amber-100 disabled:opacity-30 hover:bg-amber-50 dark:hover:bg-[#1d160e] transition">
                      Anterior
                    </button>
                    <button onClick={() => setHistPage(p => Math.min(histTotalPages, p + 1))} disabled={histPage === histTotalPages}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-900 dark:text-amber-100 disabled:opacity-30 hover:bg-amber-50 dark:hover:bg-[#1d160e] transition">
                      Próximo
                    </button>
                    <select value={histPageSize} onChange={e => { setHistPageSize(Number(e.target.value)); setHistPage(1); setHistSelected(new Set()); }}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 cursor-pointer focus:outline-none">
                      <option value={10}>10 / pág</option>
                      <option value={20}>20 / pág</option>
                      <option value={50}>50 / pág</option>
                      <option value={100}>100 / pág</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL / BOTTOM SHEET 1: CRUD MATERIAL FORM */}
      {isEditing && (store.hasPermission('materiais.criar') || store.hasPermission('materiais.editar')) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" id="modal-material">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                {editId ? 'Editar Ingrediente' : 'Novo Ingrediente'}
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Nome do Ingrediente *</label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Farinha de trigo especial, Leite condensado"
                  className="w-full h-9 px-3 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Unidade *</label>
                <div className="flex items-center gap-2">
                  <SelectSearch value={String(unidadeId)} onChange={v => setUnidadeId(Number(v))} options={store.unidades.map(u => ({ value: String(u.id), label: `${u.sigla.toUpperCase()} — ${u.nome}` }))} placeholder="Selecione a unidade" className="flex-1" />
                  <button type="button" onClick={() => setShowNovaUnidade(true)}
                    className="px-3 h-9 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition shrink-0 whitespace-nowrap">
                    + Nova Unidade
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Custo (R$ / {store.unidadeSigla(unidadeId)})</label>
                <input 
                  type="number" 
                  step="any"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(Number(e.target.value))}
                  {...useSmartArrowKeys(custoUnitario, setCustoUnitario)}
                  className="w-full h-9 px-3 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Fornecedor principal *</label>
                <div className="flex items-center gap-2">
                  <SelectSearch value={String(fornecedorId)} onChange={v => setFornecedorId(Number(v))} options={[{ value: '', label: 'Nenhum' }, ...store.fornecedores.filter(f => f.ativo !== false).map(f => ({ value: String(f.id), label: f.nome_fantasia }))]} placeholder="Selecione o fornecedor" className="flex-1" />
                  <button type="button" onClick={() => setShowNovoFornecedor(true)}
                    className="px-3 h-9 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition shrink-0 whitespace-nowrap">
                    + Novo Fornecedor
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">{editId ? 'Qtd Atual' : 'Qtd Inicial'}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={quantidadeAtual}
                    onChange={(e) => setQuantidadeAtual(Number(e.target.value))}
                    {...useSmartArrowKeys(quantidadeAtual, setQuantidadeAtual)}
                    className="w-full h-9 px-3 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Qtd Mínima</label>
                  <input 
                    type="number" 
                    step="any"
                    value={quantidadeMinima}
                    onChange={(e) => setQuantidadeMinima(Number(e.target.value))}
                    {...useSmartArrowKeys(quantidadeMinima, setQuantidadeMinima)}
                    className="w-full h-9 px-3 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-center shadow cursor-pointer"
                >
                  {editId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET 2: QUICK INBOUND STOCK FORM */}
      {isInbounding && store.hasPermission('materiais.editar') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" id="modal-inbound">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                  Lançar Entrada de Estoque
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5 font-sans">
                  Registrar compra ou reposição do ingrediente: <span className="font-semibold text-amber-900 dark:text-amber-200">{store.materiais.find(m => m.id === inboundMaterialId)?.nome}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsInbounding(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-[#f8f1ea] p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInbound} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Quantidade Adquirida</label>
                  <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                    <input 
                      type="number" 
                      step="any"
                      min="0.001"
                      value={inboundQtd}
                      onChange={(e) => setInboundQtd(Number(e.target.value))}
                      {...useSmartArrowKeys(inboundQtd, setInboundQtd, 0.001)}
                      className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                      required
                      placeholder="Ex: 10, 2.5"
                    />
                    <span className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[10px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                      {store.unidadeSigla(store.materiais.find(m => m.id === inboundMaterialId)?.unidade_id || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Preço Unitário Pago (R$ / {store.unidadeSigla(store.materiais.find(m => m.id === inboundMaterialId)?.unidade_id || 0)}) *</label>
                  <input 
                    type="number" 
                    step="any"
                    min="0"
                    value={inboundCustoUnitario === 0 ? '' : inboundCustoUnitario}
                    onChange={(e) => setInboundCustoUnitario(Number(e.target.value))}
                    {...useSmartArrowKeys(inboundCustoUnitario, setInboundCustoUnitario, 0)}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] focus:outline-none focus:border-amber-400 bg-white dark:bg-[#1c140c] rounded-lg text-amber-950 dark:text-amber-100 font-mono text-xs placeholder:text-gray-400"
                    required
                    placeholder="Ex: 5.50"
                  />
                  <span className="text-[9px] text-gray-400 dark:text-amber-100/30 mt-0.5 block font-sans">
                    Preço de custo anterior: {(store.materiais.find(m => m.id === inboundMaterialId)?.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Observação / Nota fiscal (Opcional)</label>
                <input 
                  type="text" 
                  value={inboundObs}
                  onChange={(e) => setInboundObs(e.target.value)}
                  placeholder="Ex: Compra semanal Atacadão, NF-243"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 dark:focus:border-amber-550 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400"
                />
              </div>

              {/* Despesa automática toggle */}
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#f8f5ee] dark:bg-[#130b04] cursor-pointer">
                <input type="checkbox" checked={inboundCriarDespesa} onChange={e => setInboundCriarDespesa(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" />
                <div>
                  <span className="text-xs font-medium text-[#2e2315] dark:text-amber-100">Criar despesa no financeiro</span>
                  <p className="text-[9px] text-[#5c4a37]/60 dark:text-amber-100/50">Registra esta compra como despesa em Matéria-Prima</p>
                </div>
              </label>

              {inboundCriarDespesa && (
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">Forma de Pagamento</label>
                  <SelectSearch value={inboundFormaPagamento} onChange={v => setInboundFormaPagamento(v)} options={[{ value: '', label: 'Selecione a forma de pagamento' }, ...opcoesPagamento.map(op => ({ value: op, label: op }))]} placeholder="Forma de pagamento" />
                </div>
              )}

              {/* Total estimation preview */}
              <div className="p-3.5 bg-emerald-50/50 dark:bg-[#072410]/30 rounded-xl border border-emerald-100 dark:border-[#123e1d] flex items-center justify-between text-xs font-sans mt-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-300">Total Pago:</span>
                  <p className="text-[9px] text-gray-400 dark:text-amber-100/30 mt-0.5">
                    Atualiza preço do ingrediente
                  </p>
                </div>
                <span className="font-bold font-mono text-emerald-800 dark:text-emerald-400 text-base">
                  {(inboundQtd * inboundCustoUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsInbounding(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-750 text-white font-semibold py-2.5 rounded-xl text-center shadow-sm cursor-pointer font-sans"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick-add fornecedor */}
      {showNovoFornecedor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120c06] max-w-sm w-full rounded-2xl p-6 border border-amber-100 dark:border-[#2d1e0d]">
            <h3 className="font-semibold text-base text-amber-950 dark:text-amber-100 mb-4">Novo Fornecedor</h3>
            <form onSubmit={handleCriarFornecedor} className="space-y-3">
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Nome fantasia *</label>
                <input type="text" value={novoFornecedorNome} onChange={e => setNovoFornecedorNome(e.target.value)} required
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              </div>
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Contato</label>
                <input type="text" value={novoFornecedorContato} onChange={e => setNovoFornecedorContato(e.target.value)}
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              </div>
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Telefone</label>
                <input type="text" value={novoFornecedorTel} onChange={e => setNovoFornecedorTel(e.target.value)}
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              </div>
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Email</label>
                <input type="email" value={novoFornecedorEmail} onChange={e => setNovoFornecedorEmail(e.target.value)}
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNovoFornecedor(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-xs cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={savingFornecedor}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-semibold rounded-xl text-xs cursor-pointer disabled:cursor-not-allowed">
                  {savingFornecedor ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick-add unidade */}
      {showNovaUnidade && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#120c06] max-w-sm w-full rounded-2xl p-6 border border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-base text-amber-950 dark:text-amber-100">Nova Unidade de Medida</h3>
            </div>
            <form onSubmit={handleCriarUnidade} className="space-y-3">
              <div>
                <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Nome completo *</label>
                <input type="text" value={novaUnidadeNome} onChange={e => setNovaUnidadeNome(e.target.value)} required
                  placeholder="Ex: Quilograma, Litro, Dúzia"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Sigla *</label>
                  <input type="text" value={novaUnidadeSigla} onChange={e => setNovaUnidadeSigla(e.target.value)} required
                    placeholder="Ex: kg, L, dz"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono placeholder:text-gray-400 dark:placeholder:text-amber-200/20" />
                </div>
                <div>
                  <label className="text-xs text-amber-950 dark:text-amber-100 font-medium">Tipo *</label>
                  <SelectSearch value={novaUnidadeTipo} onChange={v => setNovaUnidadeTipo(v as 'massa' | 'volume' | 'unidade')} options={[{ value: 'massa', label: 'Massa (peso)' }, { value: 'volume', label: 'Volume (líquido)' }, { value: 'unidade', label: 'Unidade (contável)' }]} placeholder="Tipo" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNovaUnidade(false)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-xs cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={savingUnidade}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl text-xs cursor-pointer disabled:cursor-not-allowed">
                  {savingUnidade ? 'Criando...' : 'Criar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-amber-100 dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Excluir Ingrediente?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              O ingrediente <strong>"{deleteConfirm.name}"</strong> será excluído permanentemente. Todas as fichas técnicas associadas a ele também serão impactadas.
            </p>
            <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={async () => { store.deleteMaterial(deleteConfirm.id); setDeleteConfirm(null); onUpdate(); }}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmarLimpezaHistorico
        open={showLimparConfirm}
        onClose={() => setShowLimparConfirm(false)}
        onConfirm={handleLimparSelecionados}
        totalRegistros={histSelected.size}
        tipoLabel="Insumos (Matérias-Primas)"
      />

    </div>
  );
}
