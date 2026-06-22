import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Material } from '../types';
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
  X,
  PackageOpen,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';

interface MateriaisProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Materiais({ store, onUpdate }: MateriaisProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCritico, setFilterCritico] = useState(false);
  const [activeTab, setActiveTab] = useState<'lista' | 'historico'>('lista');

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState<'kg' | 'g' | 'L' | 'mL' | 'un'>('kg');
  const [quantidadeAtual, setQuantidadeAtual] = useState<number>(0);
  const [quantidadeMinima, setQuantidadeMinima] = useState<number>(0);
  const [custoUnitario, setCustoUnitario] = useState<number>(0);
  const [fornecedor, setFornecedor] = useState('');

  // Quick Inbound replenishment state
  const [isInbounding, setIsInbounding] = useState(false);
  const [inboundMaterialId, setInboundMaterialId] = useState<string>('');
  const [inboundQtd, setInboundQtd] = useState<number>(1);
  const [inboundCustoUnitario, setInboundCustoUnitario] = useState<number>(0);
  const [inboundObs, setInboundObs] = useState<string>('');

  // Filter materials list
  const filteredMateriais = store.materiais.filter(m => {
    const batchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.fornecedor.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterCritico) {
      return batchesSearch && m.quantidade_atual < m.quantidade_minima;
    }
    return batchesSearch;
  });

  const handleOpenNew = () => {
    setIsEditing(true);
    setEditId(null);
    setNome('');
    setUnidade('kg');
    setQuantidadeAtual(0);
    setQuantidadeMinima(0);
    setCustoUnitario(0);
    setFornecedor('');
  };

  const handleOpenEdit = (m: Material) => {
    setIsEditing(true);
    setEditId(m.id);
    setNome(m.nome);
    setUnidade(m.unidade);
    setQuantidadeAtual(m.quantidade_atual);
    setQuantidadeMinima(m.quantidade_minima);
    setCustoUnitario(m.custo_unitario);
    setFornecedor(m.fornecedor);
  };

  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !fornecedor.trim()) {
      alert('Favor preencher o nome e o fornecedor.');
      return;
    }

    if (editId) {
      store.updateMaterial(editId, {
        nome,
        unidade,
        quantidade_atual: Number(quantidadeAtual),
        quantidade_minima: Number(quantidadeMinima),
        custo_unitario: Number(custoUnitario),
        fornecedor
      });
    } else {
      store.addMaterial({
        nome,
        unidade,
        quantidade_atual: Number(quantidadeAtual),
        quantidade_minima: Number(quantidadeMinima),
        custo_unitario: Number(custoUnitario),
        fornecedor
      });
    }

    setIsEditing(false);
    onUpdate();
  };

  const handleDeleteMaterial = (id: string, name: string) => {
    if (confirm(`Tem certeza que de deseja excluir o ingrediente "${name}"? Todas as fichas técnicas associadas a ele também serão impactadas.`)) {
      store.deleteMaterial(id);
      onUpdate();
    }
  };

  // Stock Inbound purchase helper
  const handleOpenInbound = (m: Material) => {
    setInboundMaterialId(m.id);
    setInboundQtd(1);
    setInboundCustoUnitario(m.custo_unitario);
    setInboundObs('');
    setIsInbounding(true);
  };

  const handleSaveInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (inboundQtd <= 0) {
      alert('A quantidade deve ser maior do que zero.');
      return;
    }
    if (inboundCustoUnitario < 0) {
      alert('O custo unitário não pode ser menor do que zero.');
      return;
    }
    store.lancarEntradaMaterial(inboundMaterialId, Number(inboundQtd), Number(inboundCustoUnitario), inboundObs);
    setIsInbounding(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-amber-800 dark:text-amber-400 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Insumos</span>
          <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-amber-100">Despensa de Matérias-Primas</h1>
          <p className="text-sm text-amber-900/60 dark:text-[#a59587] mt-1 font-sans">Gerencie os ingredientes, compre insumos, controle custos e resolva alertas de reestoque.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('lista')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-sans transition border ${
              activeTab === 'lista' 
                ? 'bg-amber-104 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-[#3a2713] bg-amber-100' 
                : 'bg-white dark:bg-[#150f09] text-gray-600 dark:text-[#a59587] border-gray-100 dark:border-[#20150b]'
            }`}
          >
            Estoque Atual
          </button>
          <button 
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-sans transition border ${
              activeTab === 'historico' 
                ? 'bg-amber-104 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-[#3a2713] bg-amber-100' 
                : 'bg-white dark:bg-[#150f09] text-gray-600 dark:text-[#a59587] border-gray-100 dark:border-[#20150b]'
            }`}
          >
            Histórico de Movimentações
          </button>
        </div>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-orange-950/10 border border-amber-100 dark:border-[#22160b] focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 text-amber-950 dark:text-amber-100 transition"
              />
            </div>

            <div className="flex flex-wrap w-full md:w-auto items-center justify-end gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-amber-900/80 dark:text-amber-200/80 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterCritico}
                  onChange={(e) => setFilterCritico(e.target.checked)}
                  className="rounded border-amber-300 dark:border-amber-950/40 text-amber-600 focus:ring-amber-500"
                />
                <span className="flex items-center gap-1">
                  <AlertTriangle size={14} className="text-red-500" /> Somente críticos / em falta
                </span>
              </label>

              <button 
                onClick={handleOpenNew}
                className="bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-750 shadow-sm text-white text-xs font-semibold font-sans py-2 px-3 rounded-xl transition flex items-center gap-1 w-full sm:w-auto justify-center cursor-pointer"
              >
                <Plus size={14} /> Novo Ingrediente
              </button>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-fade-in" id="materials-stats-grid">
            <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-50 dark:border-[#22160b] text-xs flex flex-col justify-between overflow-hidden">
              <p className="text-gray-500 dark:text-amber-100/40 font-sans truncate">Total de Categorias</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold font-mono text-amber-950 dark:text-amber-100 mt-1 truncate" title={`${store.materiais.length} itens`}>
                {store.materiais.length} itens
              </p>
            </div>
            <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-50 dark:border-[#22160b] text-xs flex flex-col justify-between overflow-hidden">
              <p className="text-red-650 dark:text-red-400 flex items-center gap-1 font-medium font-sans truncate">⚠️ Abaixo do Mínimo</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold font-mono text-red-650 dark:text-red-400 mt-1 truncate" title={`${store.materiais.filter(m => m.quantidade_atual < m.quantidade_minima).length} itens`}>
                {store.materiais.filter(m => m.quantidade_atual < m.quantidade_minima).length} itens
              </p>
            </div>
            <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-50 dark:border-[#22160b] text-xs flex flex-col justify-between overflow-hidden">
              <p className="text-gray-500 dark:text-amber-100/40 font-sans truncate">Ativos no Cardápio</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold font-mono text-amber-950 dark:text-amber-100 mt-1 truncate" title={`${store.produtos.length} produtos`}>
                {store.produtos.length} produtos
              </p>
            </div>
            <div className="bg-amber-50/40 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-50 dark:border-[#22160b] text-xs flex flex-col justify-between overflow-hidden">
              <p className="text-gray-500 dark:text-amber-100/40 font-sans truncate" title="Valor Investido (Estoque)">Valor Investido (Estoque)</p>
              <p className="text-sm sm:text-base lg:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 truncate" title={(store.materiais.reduce((sum, m) => sum + (m.quantidade_atual * m.custo_unitario), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
                {(store.materiais.reduce((sum, m) => sum + (m.quantidade_atual * m.custo_unitario), 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          {/* Table / Cards List */}
          {filteredMateriais.length === 0 ? (
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
                      <th className="p-3 pl-4 whitespace-nowrap">Ingrediente</th>
                      <th className="p-3 whitespace-nowrap">Fornecedor</th>
                      <th className="p-3 whitespace-nowrap">Estoque Atual</th>
                      <th className="p-3 whitespace-nowrap">Mínimo Crítico</th>
                      <th className="p-3 whitespace-nowrap">Preço Unitário</th>
                      <th className="p-3 whitespace-nowrap">Última Atualização</th>
                      <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMateriais.map(m => {
                      const isAbatido = m.quantidade_atual < m.quantidade_minima;
                      return (
                        <tr key={m.id} className="border-b border-amber-50/50 dark:border-[#22160b]/40 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 transition">
                          <td className="p-3 pl-4 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{m.nome}</td>
                          <td className="p-3 text-gray-650 dark:text-amber-100/60 whitespace-nowrap">{m.fornecedor}</td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold
                              ${isAbatido ? 'bg-red-100 dark:bg-red-950/25 text-red-700 dark:text-red-350 animate-pulse' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'}
                            `}>
                              {m.quantidade_atual} {m.unidade}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-500 dark:text-amber-100/40 whitespace-nowrap">{m.quantidade_minima} {m.unidade}</td>
                          <td className="p-3 font-mono text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">{m.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[10px] text-gray-400 dark:text-amber-100/30">/{m.unidade}</span></td>
                          <td className="p-3 text-gray-400 dark:text-amber-100/30 whitespace-nowrap">{new Date(m.data_ultima_atualizacao).toLocaleDateString('pt-BR')}</td>
                          <td className="p-3 text-right pr-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleOpenInbound(m)}
                                className="bg-emerald-50 dark:bg-[#152e18] hover:bg-emerald-100 dark:hover:bg-[#1d4221] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-[#1d4022] rounded-lg px-2 py-1 text-[10px] font-bold cursor-pointer whitespace-nowrap"
                              >
                                + Compra/Entrada
                              </button>
                              <button 
                                onClick={() => handleOpenEdit(m)}
                                className="hover:bg-amber-100 dark:hover:bg-amber-950 p-1.5 rounded-lg text-amber-900 dark:text-amber-200 transition cursor-pointer"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteMaterial(m.id, m.nome)}
                                className="hover:bg-red-100 dark:hover:bg-red-950/30 p-1.5 rounded-lg text-red-650 dark:text-red-400 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
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
                {filteredMateriais.map(m => {
                  const isAbatido = m.quantidade_atual < m.quantidade_minima;
                  return (
                    <div key={m.id} className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-amber-950 dark:text-amber-100 text-sm font-display">{m.nome}</h4>
                          <p className="text-[10px] text-gray-500 dark:text-amber-100/40 mt-0.5 font-sans">Forn: {m.fornecedor}</p>
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
                            {m.quantidade_atual} {m.unidade}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 dark:text-amber-150/40 uppercase font-medium">Mínimo</p>
                          <p className="font-mono text-gray-600 dark:text-amber-200 text-xs mt-0.5">{m.quantidade_minima} {m.unidade}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-500 dark:text-amber-150/40 uppercase font-medium">Custo Unit.</p>
                          <p className="font-mono text-emerald-700 dark:text-emerald-400 text-xs font-bold mt-0.5">{m.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-50 dark:border-[#22160b]">
                        <button 
                          onClick={() => handleOpenInbound(m)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-750 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg text-center cursor-pointer font-sans"
                        >
                          + Entrada/Compra
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(m)}
                          className="bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-100 p-1.5 rounded-lg text-xs font-sans cursor-pointer"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteMaterial(m.id, m.nome)}
                          className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-650 dark:text-red-300 p-1.5 rounded-lg text-xs font-sans cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* History of Inventory Movements Tab */
        <div className="bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold font-display text-amber-950 dark:text-amber-100 text-base">Registro de Entradas e Saídas</h3>
            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-[#382613] font-bold px-2 py-0.5 rounded font-mono">
              {store.movMateriais.length} movimentações no total
            </span>
          </div>

          {store.movMateriais.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-amber-100/30 py-8 text-xs font-sans">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
              {store.movMateriais.map((mov, idx) => {
                const mat = store.materiais.find(m => m.id === mov.material_id);
                const isEntrada = mov.tipo === 'entrada_compra';
                return (
                  <div key={idx} className="p-3 bg-amber-50/10 dark:bg-[#1d160e]/30 rounded-xl border border-amber-50 dark:border-[#2d1e0d] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isEntrada ? 'bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-355' : 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'}`}>
                        {isEntrada ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="font-semibold text-amber-950 dark:text-amber-150">{mat?.nome || 'Ingrediente Desconhecido'}</p>
                        <p className="text-gray-500 dark:text-amber-100/40 text-[10px] mt-0.5 font-sans">{mov.observacao}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono ${isEntrada ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                        {isEntrada ? '+' : '-'}{mov.quantidade}{mat?.unidade || ''}
                      </p>
                      {isEntrada && (mov.valor_pago !== undefined || mov.custo_unitario !== undefined || mat?.custo_unitario) && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-mono">
                          PAGO: {(mov.valor_pago !== undefined ? mov.valor_pago : (mov.custo_unitario || mat?.custo_unitario || 0) * mov.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          <span className="text-gray-400 dark:text-amber-100/30 font-sans font-normal ml-1">
                            ({(mov.custo_unitario !== undefined ? mov.custo_unitario : mat?.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{mat?.unidade || ''})
                          </span>
                        </p>
                      )}
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

      {/* MODAL / BOTTOM SHEET 1: CRUD MATERIAL FORM */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in" id="modal-material">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                {editId ? 'Editar Ingrediente' : 'Novo Ingrediente'}
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-amber-955 dark:hover:text-amber-200 p-1 cursor-pointer"
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
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 dark:focus:border-amber-550 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Unidade *</label>
                  <select 
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value as any)}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
                  >
                    <option value="kg" className="dark:bg-[#1c140c]">kg (Quilograma)</option>
                    <option value="g" className="dark:bg-[#1c140c]">g (Grama)</option>
                    <option value="L" className="dark:bg-[#1c140c]">L (Litro)</option>
                    <option value="mL" className="dark:bg-[#1c140c]">mL (Mililitro)</option>
                    <option value="un" className="dark:bg-[#1c140c]">un (Lata/Unidade)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Fornecedor principal *</label>
                  <input 
                    type="text" 
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Ex: Atacado Central"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 dark:focus:border-amber-550 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans font-sans">Qtd Atual</label>
                  <input 
                    type="number" 
                    step="any"
                    value={quantidadeAtual}
                    onChange={(e) => setQuantidadeAtual(Number(e.target.value))}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans font-sans">Qtd Mínima</label>
                  <input 
                    type="number" 
                    step="any"
                    value={quantidadeMinima}
                    onChange={(e) => setQuantidadeMinima(Number(e.target.value))}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans font-sans">Custo (R$)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={custoUnitario}
                    onChange={(e) => setCustoUnitario(Number(e.target.value))}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg focus:outline-none focus:border-amber-400 text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono"
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
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-850 dark:hover:bg-amber-800 text-white font-semibold py-2.5 rounded-xl text-center shadow-sm cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL / BOTTOM SHEET 2: QUICK INBOUND STOCK FORM */}
      {isInbounding && (
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
                      className="w-full p-2 focus:outline-none font-mono text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                      required
                      placeholder="Ex: 10, 2.5"
                    />
                    <span className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-[10px] font-bold text-amber-900 dark:text-amber-200 font-mono whitespace-nowrap">
                      {store.materiais.find(m => m.id === inboundMaterialId)?.unidade}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Preço Unitário Pago (R$ / {store.materiais.find(m => m.id === inboundMaterialId)?.unidade}) *</label>
                  <input 
                    type="number" 
                    step="any"
                    min="0"
                    value={inboundCustoUnitario === 0 ? '' : inboundCustoUnitario}
                    onChange={(e) => setInboundCustoUnitario(Number(e.target.value))}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] focus:outline-none focus:border-amber-400 bg-white dark:bg-[#1c140c] rounded-lg text-amber-950 dark:text-amber-100 font-mono text-xs placeholder:text-gray-400"
                    required
                    placeholder="Ex: 5.50"
                  />
                  <span className="text-[9px] text-gray-400 dark:text-amber-100/30 mt-0.5 block font-sans">
                    Preço de custo anterior: {(store.materiais.find(m => m.id === inboundMaterialId)?.custo_unitario || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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

    </div>
  );
}
