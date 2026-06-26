import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { EstoqueProduto } from '../types';
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
  History, 
  Tag, 
  Info, 
  X,
  Layers,
  Sparkles,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { sugerirMaximoProduzivel } from '../lib/calculos';

interface EstoqueProdutosProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function EstoqueProdutos({ store, onUpdate }: EstoqueProdutosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'em_falta' | 'baixo_estoque' | 'lote_validade'>('todos');
  const [activeTab, setActiveTab] = useState<'painel' | 'lotes' | 'historico'>('painel');

  // Lote form state
  const [isLoteOpen, setIsLoteOpen] = useState(false);
  const [loteProdutoId, setLoteProdutoId] = useState('');
  const [loteQtd, setLoteQtd] = useState<number>(12);
  const [loteNumero, setLoteNumero] = useState('');
  const [loteValidade, setLoteValidade] = useState('');
  const [loteObs, setLoteObs] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit stock threshold state
  const [isEditThresholdOpen, setIsEditThresholdOpen] = useState(false);
  const [thresholdProdutoId, setThresholdProdutoId] = useState('');
  const [thresholdQtd, setThresholdQtd] = useState<number>(5);

  const getProdutoName = (id: string) => {
    return store.produtos.find(p => p.id === id)?.nome || 'Produto Desconhecido';
  };

  const filteredEstoque = store.estoqueProdutos.filter(ep => {
    const p = store.produtos.find(prod => prod.id === ep.produto_id);
    if (!p) return false;

    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const isZero = ep.quantidade_disponivel === 0;
    const isLow = ep.quantidade_disponivel < ep.quantidade_minima;

    if (filterType === 'em_falta') {
      return matchesSearch && isZero;
    }
    if (filterType === 'baixo_estoque') {
      return matchesSearch && isLow && !isZero;
    }
    if (filterType === 'lote_validade') {
      return matchesSearch && ep.data_validade !== undefined;
    }
    return matchesSearch;
  });

  const handleOpenLoteForm = (produtoId?: string) => {
    setErrorMessage(null);
    setIsLoteOpen(true);
    setLoteProdutoId(produtoId || (store.produtos[0]?.id || ''));
    setLoteQtd(12);
    // Auto-generate realistic lote number based on current date
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '').substring(2);
    setLoteNumero(`L-${dateStr}${Math.floor(Math.random() * 100)}`);
    // Expiration date suggestion: 5 days from today
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

    const result = await store.lancarLoteProducao(loteProdutoId, Number(loteQtd), loteNumero, loteValidade, loteObs);
    if (result.success) {
      setIsLoteOpen(false);
      onUpdate();
    } else {
      setErrorMessage(result.error || 'Erro ao lançar produção de lote.');
    }
  };

  const handleOpenThreshold = (ep: EstoqueProduto) => {
    setThresholdProdutoId(ep.produto_id);
    setThresholdQtd(ep.quantidade_minima);
    setIsEditThresholdOpen(true);
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateEstoqueProdutoConfig(thresholdProdutoId, {
      quantidade_minima: Number(thresholdQtd)
    });
    setIsEditThresholdOpen(false);
    onUpdate();
  };

  const handleResetLoteFilters = () => {
    setSearchTerm('');
    setFilterType('todos');
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-amber-800 dark:text-amber-400 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Prateleira</span>
          <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-amber-100">Estoque de Produtos Acabados</h1>
          <p className="text-sm text-amber-900/60 dark:text-amber-100/40 mt-1">Monitore coxinhas, brigadeiros e bolos assados livres para venda ou reservados para encomendas.</p>
        </div>

        {store.hasPermission('estoque.criar') && (
          <button 
            onClick={() => handleOpenLoteForm()}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-750 dark:hover:bg-emerald-700 shadow-sm text-white text-xs font-semibold font-sans py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center font-medium cursor-pointer"
          >
            <Layers size={16} /> Lançar Lote de Produção
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
          Movimentações Assadas
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
                placeholder="Buscar por nome do produto pronto..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1c140c] border border-amber-100 dark:border-[#2a1d10] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-700 transition"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
              {[
                { type: 'todos', label: 'Todos' },
                { type: 'em_falta', label: 'Esgotados / Zerados 🚨' },
                { type: 'baixo_estoque', label: 'Estoque Baixo ⚠️' },
                { type: 'lote_validade', label: 'Controlar Validades 📅' }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => setFilterType(item.type as any)}
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

          {/* Core Table Grid */}
          {filteredEstoque.length === 0 ? (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="ready-products-grid">
              {filteredEstoque.map(ep => {
                const prod = store.produtos.find(p => p.id === ep.produto_id);
                if (!prod) return null;

                const isLacking = ep.quantidade_disponivel === 0;
                const isUnderMin = ep.quantidade_disponivel < ep.quantidade_minima;
                
                // Expiry assessment if present
                const expDate = ep.data_validade ? new Date(ep.data_validade) : null;
                const isExpired = expDate ? expDate.getTime() < new Date().getTime() : false;

                return (
                  <div 
                    key={ep.id}
                    className={`bg-white dark:bg-[#150f09] rounded-2xl border p-4 sm:p-5 shadow-sm hover:border-amber-200 dark:hover:border-amber-800 transition flex flex-col justify-between space-y-4
                      ${isLacking ? 'border-red-100 dark:border-red-950/30 bg-red-50/10' : 'border-amber-100 dark:border-[#22160b]'}
                    `}
                  >
                    {/* Item info */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-50 dark:border-[#2c1d0e] px-2 py-0.5 rounded-full font-bold uppercase font-mono">
                            {store.categoriaNome(prod.categoria_id)}
                          </span>
                          <h4 className="font-semibold text-sm sm:text-base font-display text-amber-950 dark:text-amber-100 mt-1.5">
                            {prod.nome}
                          </h4>
                        </div>

                        {isLacking ? (
                          <span className="bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-red-200 dark:border-red-900/40 animate-pulse">
                            Zeradão 📭
                          </span>
                        ) : isUnderMin ? (
                          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-200 dark:border-amber-900/40">
                            Abaixo Mín.
                          </span>
                        ) : (
                          <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200 dark:border-emerald-900/45">
                            Estável ✅
                          </span>
                        )}
                      </div>

                      {/* Balances details */}
                      <div className="grid grid-cols-2 gap-2 bg-gradient-to-br from-amber-50/10 to-orange-50/10 dark:from-amber-950/10 dark:to-orange-950/10 p-3 rounded-xl border border-amber-50 dark:border-[#2c1d0e] text-center text-xs">
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-amber-100/40 uppercase font-semibold whitespace-nowrap">Livre P/ Venda</p>
                          <p className="text-sm sm:text-base font-bold font-mono text-amber-950 dark:text-amber-100 mt-1 truncate" title={`${ep.quantidade_disponivel} ${store.unidadeNome(prod.unidade_producao_id)}`}>
                            {ep.quantidade_disponivel} <span className="text-[10px] font-sans font-normal text-gray-400 dark:text-amber-100/30">{store.unidadeNome(prod.unidade_producao_id)}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 dark:text-amber-100/40 uppercase font-semibold whitespace-nowrap">Reservado Clientes</p>
                          <p className="text-sm sm:text-base font-bold font-mono text-amber-800 dark:text-amber-450 mt-1 truncate" title={`${ep.quantidade_reservada} ${store.unidadeNome(prod.unidade_producao_id)}`}>
                            {ep.quantidade_reservada} <span className="text-[10px] font-sans font-normal text-gray-400 dark:text-amber-100/30">{store.unidadeNome(prod.unidade_producao_id)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Expiry alerts and tags */}
                      {ep.lote && (
                        <div className="flex flex-wrap gap-2 text-[10px] text-amber-900 dark:text-amber-200 border-t border-dashed border-amber-50 dark:border-[#22160b]/50 pt-2.5">
                          <span className="flex items-center gap-1 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-0.5 rounded font-mono">
                            <Tag size={10} /> Lote: {ep.lote}
                          </span>
                          {ep.data_validade && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono
                              ${isExpired ? 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold' : 'bg-amber-50 dark:bg-amber-950/20'}
                            `}>
                              <Calendar size={10} /> Val: {new Date(ep.data_validade).toLocaleDateString('pt-BR')} {isExpired && '(VENCIDO)'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer config indicators */}
                    <div className="flex items-center justify-between border-t border-amber-50 dark:border-[#22160b]/40 pt-2.5">
                      <div className="text-[10px] text-gray-500 dark:text-amber-100/45 font-mono">
                        Qtd Mínima: <span className="font-bold">{ep.quantidade_minima}</span> {store.unidadeNome(prod.unidade_producao_id)}
                      </div>
                      <div className="flex items-center gap-2">
                        {store.hasPermission('estoque.editar') && (
                        <button 
                          onClick={() => handleOpenThreshold(ep)}
                          className="hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-900 dark:text-amber-200 p-1 rounded transition text-[10px] font-bold cursor-pointer"
                        >
                          Ajustar Mínimo
                        </button>
                        )}
                        {store.hasPermission('estoque.criar') && (
                          <button 
                            onClick={() => handleOpenLoteForm(ep.produto_id)}
                            className="bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/20 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            + Forno
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
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
                const isBaking = mov.tipo_id === 4;
                return (
                  <div key={idx} className="p-3 bg-amber-50/10 dark:bg-[#1d160e]/30 rounded-xl border border-amber-50 dark:border-[#2d1e0d] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isBaking ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-350' : 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-350'}`}>
                        {isBaking ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-150">{prod?.nome || 'Produto Desconhecido'}</p>
                        <p className="text-gray-500 dark:text-amber-100/40 text-[10px] mt-0.5">{mov.observacao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono ${isBaking ? 'text-emerald-700 dark:text-emerald-450' : 'text-red-800 dark:text-red-400'}`}>
                        {isBaking ? '+' : '-'}{mov.quantidade} {store.unidadeNome(prod?.unidade_producao_id || 0)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-amber-100/30 mt-0.5">
                        {new Date(mov.criado_em).toLocaleDateString('pt-BR')} {new Date(mov.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
              >
                <X size={20} />
              </button>
            </div>

            {/* ERROR REPORTING FORM HEADER */}
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
                  Registrar Saída Forno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MINIMUM STOCK SHIFT CARD */}
      {isEditThresholdOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans animate-none" id="modal-threshold">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">Ajustar Estoque de Segurança</h3>
              <button onClick={() => setIsEditThresholdOpen(false)} className="text-gray-400 hover:text-amber-955  dark:hover:text-amber-200 p-1 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveThreshold} className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-500 dark:text-amber-100/40 font-medium block">Nome do Produto</label>
                <p className="font-semibold text-amber-950 dark:text-amber-100 text-sm font-display">{getProdutoName(thresholdProdutoId)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Quantidade Mínima de Segurança *</label>
                <div className="flex items-center border border-amber-200 dark:border-[#2d1e0d] rounded-lg overflow-hidden bg-white dark:bg-[#1c140c]">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Ex: 10"
                    value={thresholdQtd}
                    onChange={(e) => setThresholdQtd(Number(e.target.value))}
                    className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                    required
                  />
                  <span className="bg-amber-50 dark:bg-amber-950/35 px-3 py-2 text-[10px] font-bold text-amber-950 dark:text-amber-200 font-mono">
                    {store.unidadeNome(store.produtos.find(p => p.id === thresholdProdutoId)?.unidade_producao_id || 0)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditThresholdOpen(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl text-center shadow"
                >
                  Salvar Configuração
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
