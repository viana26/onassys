import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { EstoqueProduto, Produto } from '../types';
import { useSmartArrowKeys } from '../lib/hooks/useSmartArrowKeys';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import SelectSearch from './SelectSearch';
import ConfirmarLimpezaHistorico from './ConfirmarLimpezaHistorico';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  PackageCheck,
  X,
  Layers,
  Warehouse,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { sugerirMaximoProduzivel } from '../lib/calculos';

interface EstoqueProdutosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

type ProdutoComEstoque = EstoqueProduto & { produto_nome: string; produto_categoria_id: number; sem_estoque: boolean };

export default function EstoqueProdutos({ store, onUpdate }: EstoqueProdutosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'em_falta' | 'baixo_estoque'>('todos');
  const [activeTab, setActiveTab] = useState<'painel' | 'historico'>('painel');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Historico tab state
  const [histSearch, setHistSearch] = useState('');
  const [histTipoFilter, setHistTipoFilter] = useState(0);
  const [histProdutoFilter, setHistProdutoFilter] = useState('todos');
  const [histDataInicio, setHistDataInicio] = useState('');
  const [histDataFim, setHistDataFim] = useState('');
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(10);
  const [histSelected, setHistSelected] = useState<Set<string>>(new Set());
  const [showLimparConfirm, setShowLimparConfirm] = useState(false);

  // Lote form state
  const [isLoteOpen, setIsLoteOpen] = useState(false);
  const [loteProdutoId, setLoteProdutoId] = useState('');
  const [loteQtd, setLoteQtd] = useState<number>(12);
  const [loteObs, setLoteObs] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual stock adjustment state
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [adjustStockEstoqueId, setAdjustStockEstoqueId] = useState('');
  const [adjustStockProdutoId, setAdjustStockProdutoId] = useState('');
  const [adjustStockNovoSaldo, setAdjustStockNovoSaldo] = useState<number>(0);
  const [adjustStockQtdMinima, setAdjustStockQtdMinima] = useState<number>(0);
  const [adjustStockObs, setAdjustStockObs] = useState('');

  const getProdutoName = (id: string) => {
    return store.produtos.find(p => p.id === id)?.nome || 'Produto Desconhecido';
  };

  const filteredEstoque = useMemo(() => {
    const estoqueMap = new Map(store.estoqueProdutos.map(ep => [ep.produto_id, ep]));

    const todosProdutos: ProdutoComEstoque[] = store.produtos
      .filter(p => p.ativo)
      .map(p => {
        const ep = estoqueMap.get(p.id);
        if (ep) {
          return { ...ep, produto_nome: p.nome, produto_categoria_id: p.categoria_id, sem_estoque: false };
        }
        return {
          id: '',
          produto_id: p.id,
          quantidade_disponivel: 0,
          quantidade_minima: 0,
          data_atualizacao: '',
          produto_nome: p.nome,
          produto_categoria_id: p.categoria_id,
          sem_estoque: true,
        };
      });

    return todosProdutos.filter(ep => {
      const matchesSearch = ep.produto_nome.toLowerCase().includes(searchTerm.toLowerCase());
      const isZero = ep.quantidade_disponivel === 0;
      const isLow = ep.quantidade_disponivel < ep.quantidade_minima;

      if (filterType === 'em_falta') return matchesSearch && isZero;
      if (filterType === 'baixo_estoque') return matchesSearch && isLow && !isZero;
      return matchesSearch;
    });
  }, [store.estoqueProdutos, store.produtos, searchTerm, filterType]);

  const { sortedItems: sortedEstoque, requestSort, sortConfig } = useSortableData(filteredEstoque, 'produto_nome');
  const totalPages = Math.max(1, Math.ceil(sortedEstoque.length / pageSize));
  const paginatedEstoque = sortedEstoque.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const histFiltered = useMemo(() => {
    return store.movProdutos.filter(m => {
      if (histSearch) {
        const prod = store.produtos.find(p => p.id === m.produto_id);
        const nome = prod?.nome || '';
        if (!nome.toLowerCase().includes(histSearch.toLowerCase()) && !(m.observacao || '').toLowerCase().includes(histSearch.toLowerCase())) return false;
      }
      if (histTipoFilter && m.tipo_id !== histTipoFilter) return false;
      if (histProdutoFilter !== 'todos' && m.produto_id !== histProdutoFilter) return false;
      if (histDataInicio && new Date(m.criado_em) < new Date(histDataInicio)) return false;
      if (histDataFim) {
        const fim = new Date(histDataFim);
        fim.setDate(fim.getDate() + 1);
        if (new Date(m.criado_em) > fim) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [store.movProdutos, histSearch, histTipoFilter, histProdutoFilter, histDataInicio, histDataFim]);

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
    const result = await store.deleteMovimentacoes(ids, 'produto');
    if (result.success) {
      setHistSelected(new Set());
      setShowLimparConfirm(false);
    }
  };

  const handleSearchChange = (v: string) => {
    setSearchTerm(v);
    setCurrentPage(1);
  };

  const handleFilterChange = (v: typeof filterType) => {
    setFilterType(v);
    setCurrentPage(1);
  };

  const handleOpenLoteForm = (produtoId?: string) => {
    setErrorMessage(null);
    setIsLoteOpen(true);
    setLoteProdutoId(produtoId || (store.produtos[0]?.id || ''));
    setLoteQtd(12);
    setLoteObs('');
  };

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (loteQtd <= 0) {
      alert('Selecione uma quantidade válida para produzir.');
      return;
    }

    try {
      const result = await store.lancarLoteProducao(loteProdutoId, Number(loteQtd), loteObs);
      if (result.success) {
        setIsLoteOpen(false);
        onUpdate();
      } else {
        setErrorMessage(result.error || 'Erro ao lançar produção de lote.');
      }
    } catch (err) {
      setErrorMessage('Erro inesperado ao lançar produção.');
    }
  };

  const handleResetLoteFilters = () => {
    setSearchTerm('');
    setFilterType('todos');
  };

  const handleOpenAdjustStock = (ep: ProdutoComEstoque) => {
    setAdjustStockEstoqueId(ep.id || '');
    setAdjustStockProdutoId(ep.produto_id);
    setAdjustStockNovoSaldo(ep.quantidade_disponivel);
    setAdjustStockQtdMinima(ep.quantidade_minima);
    setAdjustStockObs('');
    setErrorMessage(null);
    setIsAdjustStockOpen(true);
  };

  const handleSaveAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustStockNovoSaldo < 0) {
      alert('O saldo não pode ser negativo.');
      return;
    }
    setErrorMessage(null);

    let estoqueId = adjustStockEstoqueId;

    if (!estoqueId) {
      const novo = await store.addEstoqueProduto({
        produto_id: adjustStockProdutoId,
        quantidade_disponivel: Number(adjustStockNovoSaldo),
        quantidade_minima: Number(adjustStockQtdMinima),
      });
      estoqueId = novo.id;
    } else {
      const resultadoEstoque = await store.ajustarEstoqueProduto(estoqueId, Number(adjustStockNovoSaldo), adjustStockObs);
      if (!resultadoEstoque.success) {
        setErrorMessage(resultadoEstoque.error || 'Erro ao ajustar estoque.');
        return;
      }
      await store.updateEstoqueProdutoConfig(estoqueId, {
        quantidade_minima: Number(adjustStockQtdMinima),
      });
    }

    setIsAdjustStockOpen(false);
  };

  const unidadeNome = (produtoId: string) => {
    const p = store.produtos.find(prod => prod.id === produtoId);
    return p ? store.unidadeSigla(p.unidade_producao_id) : '';
  };

  const statusInfo = (ep: ProdutoComEstoque) => {
    if (ep.sem_estoque) return { label: 'Novo', classes: 'bg-gray-100 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
    if (ep.quantidade_disponivel === 0) return { label: 'Esgotado', classes: 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/40' };
    if (ep.quantidade_disponivel < ep.quantidade_minima) return { label: 'Abaixo Mín.', classes: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40' };
    return { label: 'Estável', classes: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/45' };
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse size={20} className="text-amber-700 dark:text-amber-400" />
            <h1 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Estoque</h1>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50 mt-1">Monitore coxinhas, brigadeiros e bolos assados livres para venda.</p>
        </div>

        {store.hasPermission('estoque.criar') && (
          <button 
            onClick={() => handleOpenLoteForm()}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-750 dark:hover:bg-emerald-700 shadow-sm text-white text-xs font-semibold font-sans py-2 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center cursor-pointer"
          >
            <Layers size={15} /> Lançar Produção
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-amber-100 dark:border-[#22160b] gap-4" id="stock-nav">
        <button 
          onClick={() => setActiveTab('painel')}
          className={`py-2 px-3 text-xs font-semibold uppercase tracking-wider font-sans transition cursor-pointer rounded-t-xl ${
            activeTab === 'painel' 
              ? 'border-b-2 border-amber-700 dark:border-amber-400 bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold' 
              : 'text-gray-500 dark:text-[#a08f80] hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:text-amber-950 dark:hover:text-amber-200'
          }`}
        >
          Estoque de Produtos
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

      {activeTab === 'painel' ? (
        <>
          {/* Filters controls */}
          <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-amber-100/40">
                <Search size={16} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar por nome do produto..." 
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-help="estoque-busca"
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1c140c] border border-amber-100 dark:border-[#2a1d10] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-700 transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1" data-help="estoque-filtro">
              {[
                { type: 'todos' as const, label: 'Todos' },
                { type: 'em_falta' as const, label: 'Sem Estoque' },
                { type: 'baixo_estoque' as const, label: 'Estoque Baixo' }
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

          {sortedEstoque.length === 0 ? (
            <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500 dark:text-amber-100/40">
              <PackageCheck size={36} className="mx-auto text-amber-600/30 mb-2" />
              <p className="text-sm font-medium">Nenhum produto pronto com esse filtro.</p>
              <button 
                onClick={handleResetLoteFilters} 
                className="mt-2 text-xs text-amber-700 dark:text-amber-400 underline font-semibold cursor-pointer"
              >
                Limpar filtros e buscar geral
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto w-full">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                      <th className="p-3 pl-4 whitespace-nowrap"><SortButton label="Produto" sortKey="produto_nome" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th className="p-3 whitespace-nowrap"><SortButton label="Status" sortKey="quantidade_disponivel" sortConfig={sortConfig} onSort={requestSort} /></th>
                      <th className="p-3 text-right whitespace-nowrap"><SortButton label="Disponível" sortKey="quantidade_disponivel" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                      <th className="p-3 text-right whitespace-nowrap"><SortButton label="Mínimo" sortKey="quantidade_minima" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
                      <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEstoque.map(ep => {
                      const status = statusInfo(ep);
                      return (
                        <tr key={ep.produto_id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                          <td className="p-3 pl-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{ep.produto_nome}</span>
                              <span className="text-[9px] text-gray-400 dark:text-amber-100/40 font-mono">{store.categoriaNome(ep.produto_categoria_id)}</span>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${status.classes}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                            {ep.quantidade_disponivel} <span className="text-[10px] font-normal text-gray-400 dark:text-amber-100/30">{unidadeNome(ep.produto_id)}</span>
                          </td>
                          <td className="p-3 text-right font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                            {ep.quantidade_minima} <span className="text-[10px]">{unidadeNome(ep.produto_id)}</span>
                          </td>
                          <td className="p-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {store.hasPermission('estoque.editar') && (
                                <button 
                                  onClick={() => handleOpenAdjustStock(ep)}
                                  className="hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 p-1.5 rounded-lg transition cursor-pointer"
                                  title="Ajustar Estoque"
                                  data-help="estoque-novo"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}
                              {store.hasPermission('estoque.criar') && (
                                <button 
                                  onClick={() => handleOpenLoteForm(ep.produto_id)}
                                  className="bg-emerald-50 dark:bg-[#152e18] hover:bg-emerald-100 dark:hover:bg-[#1d4221] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-[#1d4022] rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                >
                                  + Forno
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

              {/* Mobile Cards */}
              <div className="md:hidden grid grid-cols-1 gap-3">
                {paginatedEstoque.map(ep => {
                  const status = statusInfo(ep);
                  return (
                    <div 
                      key={ep.produto_id}
                      className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] p-3 shadow-sm space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-sm font-display text-amber-950 dark:text-amber-100 truncate">{ep.produto_nome}</h4>
                          <span className="text-[9px] text-gray-400 dark:text-amber-100/40 font-mono">{store.categoriaNome(ep.produto_categoria_id)}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase border whitespace-nowrap ${status.classes}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between bg-amber-50/30 dark:bg-amber-950/15 p-2 rounded-lg">
                        <div className="text-center flex-1">
                          <p className="text-[9px] text-gray-500 dark:text-amber-100/40 uppercase font-semibold">Disponível</p>
                          <p className="text-lg font-bold font-mono text-amber-950 dark:text-amber-100">
                            {ep.quantidade_disponivel} <span className="text-[10px] font-normal text-gray-400">{unidadeNome(ep.produto_id)}</span>
                          </p>
                        </div>
                        <div className="text-center flex-1 border-l border-amber-100 dark:border-[#2c1d0e]">
                          <p className="text-[9px] text-gray-500 dark:text-amber-100/40 uppercase font-semibold">Mínimo</p>
                          <p className="text-lg font-bold font-mono text-gray-500 dark:text-amber-100/50">
                            {ep.quantidade_minima} <span className="text-[10px] font-normal text-gray-400">{unidadeNome(ep.produto_id)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-amber-50/50 dark:border-[#22160b]/40 pt-2">
                        <div className="flex items-center gap-1">
                          {store.hasPermission('estoque.editar') && (
                            <button 
                              onClick={() => handleOpenAdjustStock(ep)}
                              className="hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 p-1.5 rounded-lg transition text-[10px] font-semibold cursor-pointer"
                            >
                              Ajustar
                            </button>
                          )}
                        </div>
                        {store.hasPermission('estoque.criar') && (
                          <button 
                            onClick={() => handleOpenLoteForm(ep.produto_id)}
                            className="bg-emerald-50 dark:bg-[#152e18] hover:bg-emerald-100 dark:hover:bg-[#1d4221] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-[#1d4022] px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                          >
                            + Forno
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
                    Próximo <ChevronRightIcon size={14} />
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
              </>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-amber-950 dark:text-amber-100 text-base">Histórico de Movimentações</h3>
            <div className="flex items-center gap-2">
              {histSelected.size > 0 && store.hasPermission('estoque.limpar_historico') && (
                <button
                  onClick={() => setShowLimparConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                >
                  <Trash2 size={12} /> Excluir {histSelected.size} selecionado(s)
                </button>
              )}
              <span className="text-[11px] bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-250 border border-amber-100 dark:border-[#382613] font-bold px-2 py-1 rounded">
                {histFiltered.length} registros
              </span>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={histSearch} onChange={e => { setHistSearch(e.target.value); setHistPage(1); }} placeholder="Buscar produto ou observação..." className="w-full pl-7 pr-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400" />
            </div>
            <SelectSearch value={String(histTipoFilter)} onChange={v => { setHistTipoFilter(Number(v)); setHistPage(1); }} options={[{ value: '0', label: 'Todos os tipos' }, ...store.tiposMovimentacao.filter(t => t.entidade === 'produto' || t.entidade === 'ambos').map(t => ({ value: String(t.id), label: t.nome }))]} placeholder="Filtrar por tipo" />
            <SelectSearch value={histProdutoFilter} onChange={v => { setHistProdutoFilter(v); setHistPage(1); }} options={[{ value: 'todos', label: 'Todos os produtos' }, ...store.produtos.filter(p => p.ativo).map(p => ({ value: p.id, label: p.nome }))]} placeholder="Filtrar por produto" />
            <input type="date" value={histDataInicio} onChange={e => { setHistDataInicio(e.target.value); setHistPage(1); }} className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none" placeholder="Data início" />
            <input type="date" value={histDataFim} onChange={e => { setHistDataFim(e.target.value); setHistPage(1); }} className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none" placeholder="Data fim" />
          </div>

          {histFiltered.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-amber-100/30 py-8 text-xs">Nenhuma movimentação encontrada para os filtros atuais.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
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
                    <th className="p-3 pl-4 whitespace-nowrap font-semibold">Data</th>
                    <th className="p-3 whitespace-nowrap font-semibold">Produto</th>
                    <th className="p-3 whitespace-nowrap font-semibold">Tipo</th>
                    <th className="p-3 text-right whitespace-nowrap font-semibold">Quantidade</th>
                    <th className="p-3 pr-4 whitespace-nowrap font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {histPaginated.map((mov) => {
                    const prod = store.produtos.find(p => p.id === mov.produto_id);
                    const tipo = store.tiposMovimentacao.find(t => t.id === mov.tipo_id);
                    const isEntrada = tipo?.natureza === 'entrada';
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
                        <td className="p-3 pl-4 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                          {new Date(mov.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">
                          {prod?.nome || 'Produto Desconhecido'}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            isEntrada
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          }`}>
                            {isEntrada ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {store.tipoMovNome(mov.tipo_id)}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isEntrada ? '+' : '-'}{mov.quantidade}
                        </td>
                        <td className="p-3 pr-4 text-gray-500 dark:text-amber-100/40 whitespace-nowrap">
                          {mov.observacao || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
                <select value={histPageSize} onChange={e => { setHistPageSize(Number(e.target.value)); setHistPage(1); }}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 cursor-pointer focus:outline-none">
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                  <option value={100}>100 / pág</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LOTE DE PRODUÇÃO FORM MODAL */}
      {isLoteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans animate-none" id="modal-lote">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                  Lançar Produção
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Assar salgado, preparar brigadeiro e estocar pronto. Descontará automaticamente os insumos necessários.</p>
              </div>
              <button 
                onClick={() => setIsLoteOpen(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer"
                aria-label="Fechar modal de produção"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/25 text-red-800 dark:text-red-300 p-3 rounded-xl border border-red-100 dark:border-red-950/30 flex items-start gap-2 text-xs">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Insumos Críticos!</p>
                  <p className="text-[10px] leading-normal">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveLote} className="space-y-4">
              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Selecione o Produto *</label>
                <SelectSearch value={loteProdutoId} onChange={v => { setLoteProdutoId(v); setErrorMessage(null); }} options={store.produtos.map(p => ({ value: p.id, label: `${p.nome} (Sugerido máx: ${sugerirMaximoProduzivel(p.id, store.fichas, store.materiais, store.unidades)})` }))} placeholder="Selecione um produto" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">Quantidade Produzida *</label>
                  <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                    <input 
                      type="number" 
                      min="1"
                      value={loteQtd}
                      onChange={(e) => setLoteQtd(Number(e.target.value))}
                      {...useSmartArrowKeys(loteQtd, setLoteQtd, 1)}
                      className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                      required
                    />
                    <span className="bg-amber-50 dark:bg-amber-950/30 px-2.5 py-2 text-[10px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                      {store.unidadeSigla(store.produtos.find(p => p.id === loteProdutoId)?.unidade_producao_id || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 col-span-1">
                  <label className="text-gray-400 dark:text-amber-100/30 text-[10px] block font-sans">Cozinha Capacidade Máx.</label>
                  <p className="p-2 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-950/35 rounded-lg text-center font-mono font-bold text-amber-900 dark:text-amber-200">
                    {sugerirMaximoProduzivel(loteProdutoId, store.fichas, store.materiais, store.unidades)} unidades
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Observação / Ajustes adicionais</label>
                <input 
                  type="text" 
                  value={loteObs}
                  onChange={(e) => setLoteObs(e.target.value)}
                  placeholder="Ex: Assamento extra da manhã"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] text-xs rounded-lg focus:outline-none focus:border-amber-400 bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsLoteOpen(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-750 text-white font-semibold py-2.5 rounded-xl text-center shadow"
                >
                  Registrar Entrada Produção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AJUSTE MANUAL DE ESTOQUE MODAL */}
      {isAdjustStockOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans animate-none" id="modal-adjust-stock">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                  Ajustar Estoque
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Ajuste o saldo e a quantidade mínima de segurança do produto.</p>
              </div>
              <button 
                onClick={() => setIsAdjustStockOpen(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer"
                aria-label="Fechar ajuste de estoque"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/25 text-red-800 dark:text-red-300 p-3 rounded-xl border border-red-100 dark:border-red-950/30 flex items-start gap-2 text-xs">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Erro ao ajustar estoque</p>
                  <p className="text-[10px] leading-normal">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveAdjustStock} className="space-y-4">
              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium block">Produto</label>
                <p className="font-semibold text-amber-950 dark:text-amber-100 text-sm font-display">
                  {getProdutoName(adjustStockProdutoId)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-500 dark:text-amber-100/40 font-medium block">Saldo Atual</label>
                  <div className="flex items-center border border-amber-100 dark:border-amber-950/35 rounded-lg overflow-hidden bg-amber-50/50 dark:bg-amber-950/15">
                    <p className="flex-1 p-2 text-center font-mono font-bold text-amber-950 dark:text-amber-200">
                      {store.estoqueProdutos.find(e => e.id === adjustStockEstoqueId)?.quantidade_disponivel || 0}
                    </p>
                    <span className="bg-amber-100/60 dark:bg-amber-950/40 px-2 py-2 text-[10px] font-bold text-amber-950 dark:text-amber-200 font-mono">
                      {unidadeNome(adjustStockProdutoId)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium block">Novo Saldo *</label>
                  <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                    <input 
                      type="number" 
                      min="0"
                      value={adjustStockNovoSaldo}
                      onChange={(e) => setAdjustStockNovoSaldo(Number(e.target.value))}
                      {...useSmartArrowKeys(adjustStockNovoSaldo, setAdjustStockNovoSaldo, 0)}
                      className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                      required
                    />
                    <span className="bg-amber-50 dark:bg-amber-950/35 px-2 py-2 text-[10px] font-bold text-amber-950 dark:text-amber-200 font-mono">
                      {unidadeNome(adjustStockProdutoId)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium block">Qtd. Mínima *</label>
                  <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                    <input 
                      type="number" 
                      min="0"
                      value={adjustStockQtdMinima}
                      onChange={(e) => setAdjustStockQtdMinima(Number(e.target.value))}
                      {...useSmartArrowKeys(adjustStockQtdMinima, setAdjustStockQtdMinima, 0)}
                      className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                      required
                    />
                    <span className="bg-amber-50 dark:bg-amber-950/35 px-2 py-2 text-[10px] font-bold text-amber-950 dark:text-amber-200 font-mono">
                      {unidadeNome(adjustStockProdutoId)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Observação (opcional)</label>
                <input 
                  type="text" 
                  value={adjustStockObs}
                  onChange={(e) => setAdjustStockObs(e.target.value)}
                  placeholder="Ex: Estoque inicial de churros prontos"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] text-xs rounded-lg focus:outline-none focus:border-amber-400 bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAdjustStockOpen(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={adjustStockNovoSaldo === (store.estoqueProdutos.find(e => e.id === adjustStockEstoqueId)?.quantidade_disponivel ?? 0)}
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-center shadow disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmarLimpezaHistorico
        open={showLimparConfirm}
        onClose={() => setShowLimparConfirm(false)}
        onConfirm={handleLimparSelecionados}
        totalRegistros={histSelected.size}
        tipoLabel="Produtos"
      />

    </div>
  );
}
