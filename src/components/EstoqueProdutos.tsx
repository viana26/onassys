import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { EstoqueProduto, Produto } from '../types';
import { useSmartArrowKeys } from '../lib/hooks/useSmartArrowKeys';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Calendar, 
  PackageCheck,
  Tag, 
  X,
  Layers,
  Warehouse,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { sugerirMaximoProduzivel } from '../lib/calculos';

interface EstoqueProdutosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

type ProdutoComEstoque = EstoqueProduto & { produto_nome: string; produto_categoria_id: number; sem_estoque: boolean };

export default function EstoqueProdutos({ store, onUpdate }: EstoqueProdutosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'em_falta' | 'baixo_estoque' | 'lote_validade'>('todos');
  const [activeTab, setActiveTab] = useState<'painel' | 'historico'>('painel');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Lote form state
  const [isLoteOpen, setIsLoteOpen] = useState(false);
  const [loteProdutoId, setLoteProdutoId] = useState('');
  const [loteQtd, setLoteQtd] = useState<number>(12);
  const [loteNumero, setLoteNumero] = useState('');
  const [loteValidade, setLoteValidade] = useState('');
  const [loteObs, setLoteObs] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual stock adjustment state
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [adjustStockEstoqueId, setAdjustStockEstoqueId] = useState('');
  const [adjustStockProdutoId, setAdjustStockProdutoId] = useState('');
  const [adjustStockNovoSaldo, setAdjustStockNovoSaldo] = useState<number>(0);
  const [adjustStockQtdMinima, setAdjustStockQtdMinima] = useState<number>(0);
  const [adjustStockLote, setAdjustStockLote] = useState('');
  const [adjustStockValidade, setAdjustStockValidade] = useState('');
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
      if (filterType === 'lote_validade') return matchesSearch && !!ep.data_validade;
      return matchesSearch;
    });
  }, [store.estoqueProdutos, store.produtos, searchTerm, filterType]);

  const { sortedItems: sortedEstoque, requestSort, sortConfig } = useSortableData(filteredEstoque, 'produto_nome');
  const totalPages = Math.max(1, Math.ceil(sortedEstoque.length / pageSize));
  const paginatedEstoque = sortedEstoque.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    setLoteNumero(`L-${yy}${mm}${dd}${hh}${mi}${ss}`);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 5);
    setLoteValidade(expDate.toISOString().split('T')[0]);
    setLoteObs('Lote de forno regular');
  };

  const handleSaveLote = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (loteQtd <= 0) {
      alert('Selecione uma quantidade válida para produzir.');
      return;
    }

    try {
      const result = await store.lancarLoteProducao(loteProdutoId, Number(loteQtd), loteValidade, loteNumero, loteObs);
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
    setAdjustStockLote(ep.lote || '');
    setAdjustStockValidade(ep.data_validade || '');
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
        lote: adjustStockLote || null,
        data_validade: adjustStockValidade || null,
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
        lote: adjustStockLote || null,
        data_validade: adjustStockValidade || null,
      });
    }

    setIsAdjustStockOpen(false);
  };

  const unidadeNome = (produtoId: string) => {
    const p = store.produtos.find(prod => prod.id === produtoId);
    return p ? store.unidadeNome(p.unidade_producao_id) : '';
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
            <Layers size={15} /> Lançar Lote
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-amber-100 dark:border-[#22160b] gap-4" id="stock-nav">
        <button 
          onClick={() => setActiveTab('painel')}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider font-sans transition cursor-pointer ${
            activeTab === 'painel' ? 'border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-100 font-bold' : 'text-gray-500 dark:text-[#a08f80] hover:text-amber-950 dark:hover:text-amber-200'
          }`}
        >
          Prateleira Física
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider font-sans transition cursor-pointer ${
            activeTab === 'historico' ? 'border-b-2 border-amber-700 dark:border-amber-400 text-amber-950 dark:text-amber-100 font-bold' : 'text-gray-500 dark:text-[#a08f80] hover:text-amber-950 dark:hover:text-amber-200'
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
                { type: 'baixo_estoque' as const, label: 'Estoque Baixo' },
                { type: 'lote_validade' as const, label: 'Validades' }
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
                      <th className="p-3 whitespace-nowrap">Lote / Validade</th>
                      <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEstoque.map(ep => {
                      const status = statusInfo(ep);
                      const expDate = ep.data_validade ? new Date(ep.data_validade) : null;
                      const isExpired = expDate ? expDate.getTime() < new Date().getTime() : false;
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
                          <td className="p-3 whitespace-nowrap">
                            {ep.lote || ep.data_validade ? (
                              <div className="flex flex-wrap gap-1">
                                {ep.lote && (
                                  <span className="inline-flex items-center gap-0.5 bg-amber-50/60 dark:bg-amber-950/20 px-1.5 py-0.5 rounded text-[9px] font-mono text-amber-900 dark:text-amber-200">
                                    <Tag size={9} /> {ep.lote}
                                  </span>
                                )}
                                {ep.data_validade && (
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                                    isExpired ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                                  }`}>
                                    <Calendar size={9} /> {new Date(ep.data_validade).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-amber-100/30">—</span>
                            )}
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
                  const expDate = ep.data_validade ? new Date(ep.data_validade) : null;
                  const isExpired = expDate ? expDate.getTime() < new Date().getTime() : false;
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

                      {ep.lote && (
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="inline-flex items-center gap-1 bg-amber-50/60 dark:bg-amber-950/20 px-1.5 py-0.5 rounded font-mono text-amber-900 dark:text-amber-200">
                            <Tag size={9} /> {ep.lote}
                          </span>
                          {ep.data_validade && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono ${
                              isExpired ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                            }`}>
                              <Calendar size={9} /> {new Date(ep.data_validade).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      )}

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
              {sortedEstoque.length > pageSize && (
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
              )}
            </>
          )}
        </>
      ) : (
        /* Finished Movements and baking auditing tab */
        <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-amber-950 dark:text-amber-100 text-base">Controle de Saídas e Assamento de Forno</h3>
            <span className="text-[11px] bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-250 border border-amber-100 dark:border-[#382613] font-bold px-2 py-1 rounded">
              {store.movProdutos.length} registros
            </span>
          </div>

          {store.movProdutos.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-amber-150/30 py-8 text-xs">Nenhuma movimentação de produto pronto relatada.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
              {store.movProdutos.map((mov, idx) => {
                const prod = store.produtos.find(p => p.id === mov.produto_id);
                return (
                  <div key={idx} className="p-3 bg-amber-50/10 dark:bg-[#1d160e]/30 rounded-xl border border-amber-50 dark:border-[#2d1e0d] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${mov.quantidade >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350' : 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-350'}`}>
                        {mov.quantidade >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-150">{prod?.nome || 'Produto Desconhecido'}</p>
                        <p className="text-gray-500 dark:text-amber-100/40 text-[10px] mt-0.5">{mov.observacao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono ${mov.quantidade >= 0 ? 'text-emerald-700 dark:text-emerald-450' : 'text-red-800 dark:text-red-400'}`}>
                        {mov.quantidade >= 0 ? '+' : ''}{mov.quantidade} {unidadeNome(prod?.id || '')}
                      </p>
                      {(() => {
                        const dateObj = mov.criado_em ? new Date(mov.criado_em) : null;
                        const isDateValid = dateObj && !isNaN(dateObj.getTime());
                        return isDateValid ? (
                          <p className="text-[10px] text-gray-400 dark:text-amber-100/30 mt-0.5">
                            {dateObj.toLocaleDateString('pt-BR')} {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                );
              })}
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
                  Lançar Lote de Produção
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5">Assar salgado, preparar brigadeiro e estocar pronto. Descontará automaticamente os insumos necessários.</p>
              </div>
              <button 
                onClick={() => setIsLoteOpen(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1 cursor-pointer"
                aria-label="Fechar modal de lote"
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
                <select 
                  value={loteProdutoId}
                  onChange={(e) => {
                    setLoteProdutoId(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400"
                >
                  {store.produtos.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-[#1c140c]">{p.nome} (Sugerido máx: {sugerirMaximoProduzivel(p.id, store.fichas, store.materiais, store.unidades)})</option>
                  ))}
                </select>
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
                      {store.unidadeNome(store.produtos.find(p => p.id === loteProdutoId)?.unidade_producao_id || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Lote N.º *</label>
                  <input 
                    type="text" 
                    value={loteNumero}
                    onChange={(e) => setLoteNumero(e.target.value)}
                    placeholder="Ex: L-0504A"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Data de Validade</label>
                  <input 
                    type="date" 
                    value={loteValidade}
                    onChange={(e) => setLoteValidade(e.target.value)}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                  />
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
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium block">Lote (opcional)</label>
                  <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                    <input 
                      type="text" 
                      value={adjustStockLote}
                      onChange={(e) => setAdjustStockLote(e.target.value)}
                      placeholder="Ex: L-260710143522"
                      className="flex-1 p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const yy = String(now.getFullYear()).slice(2);
                        const mm = String(now.getMonth() + 1).padStart(2, '0');
                        const dd = String(now.getDate()).padStart(2, '0');
                        const hh = String(now.getHours()).padStart(2, '0');
                        const mi = String(now.getMinutes()).padStart(2, '0');
                        const ss = String(now.getSeconds()).padStart(2, '0');
                        setAdjustStockLote(`L-${yy}${mm}${dd}${hh}${mi}${ss}`);
                      }}
                      className="bg-amber-50 dark:bg-amber-950/35 hover:bg-amber-100 dark:hover:bg-amber-950/50 px-2 py-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 cursor-pointer whitespace-nowrap transition"
                    >
                      Gerar
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium block">Validade (opcional)</label>
                  <input 
                    type="date" 
                    value={adjustStockValidade}
                    onChange={(e) => setAdjustStockValidade(e.target.value)}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] text-xs rounded-lg focus:outline-none focus:border-amber-400 bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                  />
                </div>
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
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-center shadow"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
