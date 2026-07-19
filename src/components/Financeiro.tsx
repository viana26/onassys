import React, { useState, useMemo, useEffect } from 'react';
import { MiniFactoryStore, dataLocal } from '../lib/store';
import { LancamentoFinanceiro } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Search, Filter, FilterX, X, AlertTriangle, BarChart3, Tag, Edit2, Check, ChevronDown, ChevronRight, ChevronLeft, Receipt } from 'lucide-react';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import SelectSearch from './SelectSearch';
import MovimentacoesFinanceiras from './Relatorios/MovimentacoesFinanceiras';
import { pagamentoIcons, pagamentoLabel, formasPagamentoSelectOptions } from '../lib/pagamento';

// Helpers
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? d.substring(0, 10).split('-').reverse().join('/') : '—';

interface FinanceiroProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Financeiro({ store, onUpdate }: FinanceiroProps) {
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [showModalTipo, setShowModalTipo] = useState<'receita' | 'despesa' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LancamentoFinanceiro | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<LancamentoFinanceiro | null>(null);
  const [showMovFinanceiras, setShowMovFinanceiras] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('0');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const categoriasFinanceiro = useMemo(() => store.categoriasFinanceiro.filter(c => c.tipo === 'receita' || c.tipo === 'despesa'), [store.categoriasFinanceiro]);

  const lancamentosFiltrados = useMemo(() => {
    const base = filtroTipo === 'todas'
      ? [...store.lancamentos]
      : store.lancamentos.filter(l => l.tipo === filtroTipo);
    return base
      .filter(l => filtroCategoria === '0' || l.categoria_id === Number(filtroCategoria))
      .filter(l => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const catNome = store.categoriaFinanceiroNome(l.categoria_id).toLowerCase();
        return l.descricao?.toLowerCase().includes(term)
          || l.forma_pagamento?.toLowerCase().includes(term)
          || (l.pedido_id && l.pedido_id.toLowerCase().includes(term))
          || catNome.includes(term)
          || l.valor.toString().includes(term.replace(',', '.').replace('r$', '').trim());
      })
      .filter(l => !filtroDataInicio || l.data_lancamento >= filtroDataInicio)
      .filter(l => !filtroDataFim || l.data_lancamento <= filtroDataFim)
      .sort((a, b) => new Date(b.data_lancamento).getTime() - new Date(a.data_lancamento).getTime());
  }, [store.lancamentos, store, filtroTipo, searchTerm, filtroCategoria, filtroDataInicio, filtroDataFim]);

  const { sortedItems: sortedLancamentos, requestSort, sortConfig } = useSortableData(lancamentosFiltrados as (LancamentoFinanceiro & Record<string, unknown>)[], 'data_lancamento', 'desc');

  const totalPages = Math.max(1, Math.ceil(sortedLancamentos.length / pageSize));
  const paginatedLancamentos = sortedLancamentos.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const receitas = sortedLancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const despesas = sortedLancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldo = receitas - despesas;

  const hasFilters = filtroTipo !== 'todas' || filtroCategoria !== '0' || !!filtroDataInicio || !!filtroDataFim || !!searchTerm;
  const clearFilters = () => {
    setFiltroTipo('todas');
    setFiltroCategoria('0');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-amber-700 dark:text-amber-400" />
            <h2 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Financeiro</h2>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Receitas, despesas e fluxo de caixa</p>
        </div>
        {store.hasPermission('financeiro.lancar') && (
      <div className="flex items-center gap-2" data-help="financeiro-filtro">
            <button onClick={() => setShowMovFinanceiras(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#1a1208] border border-[#ebdcc9] dark:border-[#2e1a0a] text-[#5c4a37] dark:text-amber-100 font-semibold rounded-xl hover:bg-[#f0eade] dark:hover:bg-[#22160b] transition text-xs font-sans">
              <BarChart3 size={15} /> Relatório
            </button>
            <button onClick={() => setShowModalTipo('receita')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition text-xs font-sans"
              data-help="financeiro-novo-receita">
              <TrendingUp size={15} /> Receita
            </button>
            <button onClick={() => setShowModalTipo('despesa')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition text-xs font-sans"
              data-help="financeiro-novo-despesa">
              <TrendingDown size={15} /> Despesa
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50 font-medium">Receitas</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{brl(receitas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <TrendingDown size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50 font-medium">Despesas</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{brl(despesas)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-5">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${saldo >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <DollarSign size={20} className={saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
            </div>
            <div>
              <p className="text-xs text-[#5c4a37]/60 dark:text-amber-100/50 font-medium">Saldo</p>
              <p className={`text-xl font-bold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {brl(saldo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={clearFilters} title="Limpar filtros"
          className={`p-1.5 rounded-lg transition ${hasFilters ? 'bg-red-500 text-white hover:bg-red-600' : 'text-[#5c4a37]/40 dark:text-amber-100/30 hover:bg-[#f0eade] dark:hover:bg-[#130b04]'}`}>
          {hasFilters ? <FilterX size={14} /> : <Filter size={14} />}
        </button>
        <input type="date" value={filtroDataInicio} onChange={e => { setFiltroDataInicio(e.target.value); setCurrentPage(1); }}
          className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 w-36" />
        <input type="date" value={filtroDataFim} onChange={e => { setFiltroDataFim(e.target.value); setCurrentPage(1); }}
          className="px-2 h-9 rounded-lg text-xs border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 w-36" />
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Buscar descrição, pagamento ou pedido..."
            className="w-full pl-9 pr-3 h-9 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
        </div>
        <SelectSearch
          value={filtroCategoria} onChange={v => { setFiltroCategoria(v); setCurrentPage(1); }}
          options={[{ value: '0', label: 'Todas categorias' }, ...categoriasFinanceiro.map(c => ({ value: c.id!.toString(), label: c.nome }))]}
          placeholder="Todas categorias"
          className="w-44 h-9" />
        {(['todas', 'receita', 'despesa'] as const).map(t => (
          <button key={t} onClick={() => { setFiltroTipo(t); setCurrentPage(1); }}
            className={`h-9 px-3 rounded-lg text-xs font-semibold transition ${
              filtroTipo === t
                ? 'bg-amber-600 text-white'
                : 'bg-[#f0eade] dark:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70 hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b]'
            }`}>
            {t === 'todas' ? 'Todas' : t === 'receita' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-[#f8f5ee] dark:bg-[#130b04]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton label="Data" sortKey="data_lancamento" sortConfig={sortConfig} onSort={requestSort} /></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton label="Descrição" sortKey="descricao" sortConfig={sortConfig} onSort={requestSort} /></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton label="Categoria" sortKey="categoria_id" sortConfig={sortConfig} onSort={requestSort} /></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton label="Pagamento" sortKey="forma_pagamento" sortConfig={sortConfig} onSort={requestSort} /></th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider"><SortButton label="Valor" sortKey="valor" sortConfig={sortConfig} onSort={requestSort} align="right" /></th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 tracking-wider" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ebdcc9] dark:divide-[#2e1a0a]">
            {paginatedLancamentos.map(l => (
              <tr key={l.id} className="hover:bg-[#f8f5ee]/50 dark:hover:bg-[#130b04]/50 transition">
                <td className="px-4 py-3 text-xs text-[#5c4a37] dark:text-amber-100/70 font-mono">
                    {fmtDate(l.data_lancamento)}
                </td>
                <td className="px-4 py-3 text-xs font-medium text-[#2e2315] dark:text-amber-50">{l.descricao || '—'}</td>
                <td className="px-4 py-3 text-xs text-[#5c4a37] dark:text-amber-100/70">
                  {store.categoriaFinanceiroNome(l.categoria_id)}
                </td>
                <td className="px-4 py-3 text-xs text-[#5c4a37] dark:text-amber-100/70 flex items-center gap-1.5">
                  {pagamentoIcons[l.forma_pagamento || ''] || null}
                  {pagamentoLabel[l.forma_pagamento || ''] || l.forma_pagamento || '—'}
                </td>
                <td className={`px-4 py-3 text-right text-sm font-bold font-mono ${l.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{brl(l.valor)}
                </td>
                {store.hasPermission('financeiro.lancar') && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingLancamento(l)}
                        className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[#5c4a37]/40 dark:text-amber-100/30 hover:text-amber-600 dark:hover:text-amber-400 transition">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setDeleteConfirm(l)}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[#5c4a37]/40 dark:text-amber-100/30 hover:text-red-600 dark:hover:text-red-400 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {sortedLancamentos.length === 0 && (
          <div className="p-12 text-center">
            <Receipt size={36} className="mx-auto text-amber-600/30 mb-3" />
            <p className="text-sm font-medium text-[#5c4a37]/60 dark:text-amber-100/50">Nenhum lançamento encontrado</p>
            <p className="text-xs text-[#5c4a37]/40 dark:text-amber-100/30 mt-1">Registre receitas ou despesas usando os botões acima.</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedLancamentos.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-8 text-center">
            <Receipt size={36} className="mx-auto text-amber-600/30 mb-3" />
            <p className="text-sm font-medium text-[#5c4a37]/60 dark:text-amber-100/50">Nenhum lançamento encontrado</p>
            <p className="text-xs text-[#5c4a37]/40 dark:text-amber-100/30 mt-1">Registre receitas ou despesas usando os botões acima.</p>
          </div>
        ) : (
          paginatedLancamentos.map(l => (
            <div key={l.id} className="bg-white dark:bg-[#1a1208] rounded-xl border border-[#ebdcc9] dark:border-[#2e1a0a] p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-[#2e2315] dark:text-amber-50 truncate">{l.descricao || 'Sem descrição'}</p>
                  <p className="text-[10px] text-[#5c4a37]/50 dark:text-amber-100/30 mt-0.5 font-mono">
                  {fmtDate(l.data_lancamento)}
                  </p>
                </div>
                <span className={`text-base font-bold font-mono ${l.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{brl(l.valor)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#f0eade] dark:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70 font-medium">
                  {store.categoriaFinanceiroNome(l.categoria_id)}
                </span>
                <span className="flex items-center gap-1 text-[#5c4a37]/60 dark:text-amber-100/40">
                  {pagamentoIcons[l.forma_pagamento || ''] || null}
                  {pagamentoLabel[l.forma_pagamento || ''] || l.forma_pagamento || '—'}
                </span>
              </div>
              {store.hasPermission('financeiro.lancar') && (
                <div className="flex justify-end gap-3 pt-1 border-t border-[#ebdcc9]/50 dark:border-[#2e1a0a]/50">
                  <button onClick={() => setEditingLancamento(l)}
                    className="text-[10px] text-amber-600/60 dark:text-amber-400/60 hover:text-amber-600 dark:hover:text-amber-400 font-medium flex items-center gap-1 transition">
                    <Edit2 size={10} /> Editar
                  </button>
                  <button onClick={() => setDeleteConfirm(l)}
                    className="text-[10px] text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 font-medium flex items-center gap-1 transition">
                    <Trash2 size={10} /> Excluir
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
          <div className="text-[10px] text-gray-500 dark:text-amber-100/40">
            {sortedLancamentos.length} lançamentos — Pág. {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-900 dark:text-amber-100 disabled:opacity-30 hover:bg-amber-50 dark:hover:bg-[#1d160e] transition">
              Anterior
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-900 dark:text-amber-100 disabled:opacity-30 hover:bg-amber-50 dark:hover:bg-[#1d160e] transition">
              Próximo
            </button>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-amber-200 dark:border-[#2d1e0d] bg-white dark:bg-[#150f09] text-amber-950 dark:text-amber-100 cursor-pointer focus:outline-none">
              <option value={10}>10 / pág</option>
              <option value={20}>20 / pág</option>
              <option value={50}>50 / pág</option>
            </select>
          </div>
        </div>

      {showModalTipo && <NovoLancamentoModal store={store} initialTipo={showModalTipo} onClose={() => setShowModalTipo(null)} onSaved={() => { setShowModalTipo(null); onUpdate(); }} />}

      {editingLancamento && <NovoLancamentoModal store={store} initialTipo={editingLancamento.tipo} initialData={editingLancamento} onClose={() => setEditingLancamento(null)} onSaved={() => { setEditingLancamento(null); onUpdate(); }} />}

      {showMovFinanceiras && <MovimentacoesFinanceiras store={store} isOpen={true} onClose={() => setShowMovFinanceiras(false)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50">Excluir Lançamento?</h3>
            </div>
            <p className="text-sm text-[#5c4a37] dark:text-amber-100/70 mb-2">
              {deleteConfirm.descricao ? (
                <>O lançamento <strong>"{deleteConfirm.descricao}"</strong> de {brl(deleteConfirm.valor)} será excluído permanentemente.</>
              ) : (
                <>O lançamento de {brl(deleteConfirm.valor)} será excluído permanentemente.</>
              )}
            </p>
            <p className="text-xs text-[#5c4a37]/50 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={async () => { await store.deleteLancamentoFinanceiro(deleteConfirm.id); setDeleteConfirm(null); onUpdate(); }}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition">
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NovoLancamentoModal({ store, initialTipo, initialData, onClose, onSaved }: { store: MiniFactoryStore; initialTipo: 'receita' | 'despesa'; initialData?: LancamentoFinanceiro; onClose: () => void; onSaved: () => void }) {
  const editMode = !!initialData;
  const [tipo, setTipo] = useState<'receita' | 'despesa'>(initialData?.tipo || initialTipo);
  const [categoriaId, setCategoriaId] = useState(initialData?.categoria_id || 1);
  const [valor, setValor] = useState(initialData ? String(initialData.valor).replace('.', ',') : '');
  const [descricao, setDescricao] = useState(initialData?.descricao || '');
  const [formaPagamento, setFormaPagamento] = useState(initialData?.forma_pagamento || '');
  const raw = initialData?.data_lancamento;
  const initialDate = typeof raw === 'string' ? raw.substring(0, 10) : raw ? new Date(raw).toISOString().split('T')[0] : dataLocal();
  const [dataLancamento, setDataLancamento] = useState(initialDate);

  useEffect(() => {
    if (initialData) {
      const r = initialData.data_lancamento;
      setDataLancamento(typeof r === 'string' ? r.substring(0, 10) : r ? new Date(r).toISOString().split('T')[0] : dataLocal());
      setTipo(initialData.tipo);
      setCategoriaId(initialData.categoria_id);
      setValor(String(initialData.valor).replace('.', ','));
      setDescricao(initialData.descricao || '');
      setFormaPagamento(initialData.forma_pagamento || '');
    }
  }, [initialData?.id]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCategorias, setShowCategorias] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatCor, setNovaCatCor] = useState('#16a34a');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [editCatNome, setEditCatNome] = useState('');
  const [editCatCor, setEditCatCor] = useState('');
  const [delCatId, setDelCatId] = useState<number | null>(null);

  const categorias = store.categoriasFinanceiro.filter(c => c.tipo === tipo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { setError('Valor inválido'); return; }
    if (!formaPagamento) { setError('Selecione a forma de pagamento'); return; }
    setSaving(true);
    let ok = true;
    try {
      if (editMode && initialData) {
        const result = await store.updateLancamentoFinanceiro(initialData.id, {
          data_lancamento: dataLancamento,
          valor: valorNum,
          tipo,
          categoria_id: categoriaId,
          descricao: descricao || undefined,
          forma_pagamento: formaPagamento || undefined,
        });
        if (!result) { setError('Erro ao salvar no servidor.'); ok = false; }
      } else {
        await store.addLancamentoFinanceiro({
          data_lancamento: dataLancamento,
          valor: valorNum,
          tipo,
          categoria_id: categoriaId,
          descricao: descricao || undefined,
          forma_pagamento: formaPagamento || undefined,
        });
      }
    } catch {
      setError('Erro ao salvar. Tente novamente.');
      ok = false;
    } finally {
      setSaving(false);
    }
    if (ok) onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${tipo === 'receita' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
            {editMode ? 'Editar Lançamento' : tipo === 'receita' ? 'Nova Receita' : 'Nova Despesa'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f0eade] dark:hover:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Categoria</label>
            <div className="flex gap-1">
              <div className="flex-1">
                <SelectSearch value={String(categoriaId)} onChange={v => setCategoriaId(Number(v))} options={categorias.map(c => ({ value: String(c.id), label: c.nome }))} placeholder="Selecione a categoria" />
              </div>
              <button type="button" onClick={() => setShowCategorias(!showCategorias)}
                className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border transition text-xs font-bold ${showCategorias ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' : 'bg-[#f8f5ee] dark:bg-[#130b04] border-[#ebdcc9] dark:border-[#2e1a0a] text-[#5c4a37] dark:text-amber-100/70 hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b]'}`}>
                <Tag size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Pagamento</label>
              <SelectSearch value={formaPagamento} onChange={v => setFormaPagamento(v)} options={[{ value: '', label: 'Selecione' }, ...formasPagamentoSelectOptions]} placeholder="Forma de pagamento" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Valor</label>
              <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} required placeholder="0,00"
                className="w-full h-9 px-3 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-sm text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Data</label>
              <input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} required
                className="w-full h-9 px-3 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-sm text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do lançamento"
              className="w-full h-9 px-3 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-sm text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {showCategorias && (
            <div className={`p-3 rounded-xl border space-y-2 ${tipo === 'receita' ? 'bg-emerald-50/50 dark:bg-[#0d2215] border-emerald-200 dark:border-[#1d3d25]' : 'bg-red-50/50 dark:bg-[#2d0d0d] border-red-200 dark:border-[#3d1d1d]'}`}>
              <p className="text-[10px] font-bold uppercase text-[#5c4a37] dark:text-amber-100/60">Gerenciar categorias</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <input type="color" value={novaCatCor} onChange={e => setNovaCatCor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 shrink-0" />
                <input type="text" value={novaCatNome} onChange={e => setNovaCatNome(e.target.value)} placeholder="Nova categoria..."
                  className="flex-1 min-w-0 h-7 px-2 bg-white dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-lg text-xs text-[#2e2315] dark:text-amber-50" />
                <button type="button" onClick={async () => {
                  if (!novaCatNome.trim()) return;
                  const cat = await store.addCategoriaFinanceiro({ nome: novaCatNome.trim(), tipo, cor: novaCatCor });
                  if (cat) setCategoriaId(cat.id);
                  setNovaCatNome(''); setNovaCatCor('#16a34a');
                }} disabled={!novaCatNome.trim()}
                  className="shrink-0 h-7 px-2.5 flex items-center justify-center bg-amber-600 hover:bg-amber-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg text-xs font-bold transition">
                  <Plus size={11} />
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {categorias.map(cat => (
                  <div key={cat.id} className="flex items-center gap-1.5 py-1 px-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-[#130b04]/60">
                    {editCatId === cat.id ? (
                      <>
                        <input type="color" value={editCatCor} onChange={e => setEditCatCor(e.target.value)} className="w-4 h-4 rounded cursor-pointer border-0 p-0" />
                        <input type="text" value={editCatNome} onChange={e => setEditCatNome(e.target.value)}
                          className="flex-1 px-1.5 py-0.5 bg-white dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded text-xs text-[#2e2315] dark:text-amber-50" />
                        <button type="button" onClick={async () => {
                          if (!editCatNome.trim()) return;
                          await store.updateCategoriaFinanceiro(cat.id, { nome: editCatNome.trim(), cor: editCatCor });
                          setEditCatId(null);
                        }} className="p-0.5 text-emerald-600 dark:text-emerald-400"><Check size={10} /></button>
                        <button type="button" onClick={() => setEditCatId(null)} className="p-0.5 text-gray-400"><X size={10} /></button>
                      </>
                    ) : (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.cor }} />
                        <span className="flex-1 text-[11px] text-[#2e2315] dark:text-amber-50">{cat.nome}</span>
                        {String(cat.id) === String(categoriaId) && <Check size={10} className="text-amber-600 dark:text-amber-400" />}
                        <button type="button" onClick={() => { setEditCatId(cat.id); setEditCatNome(cat.nome); setEditCatCor(cat.cor); }}
                          className="p-0.5 text-[#5c4a37]/30 dark:text-amber-100/30 hover:text-amber-600"><Edit2 size={9} /></button>
                        {delCatId === cat.id ? (
                          <>
                            <button type="button" onClick={async () => {
                              await store.deleteCategoriaFinanceiro(cat.id);
                              if (String(cat.id) === String(categoriaId)) setCategoriaId(categorias[0]?.id || 1);
                              setDelCatId(null);
                            }} className="text-[9px] font-bold text-red-600">Sim</button>
                            <button type="button" onClick={() => setDelCatId(null)} className="text-[9px] text-gray-400">Não</button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setDelCatId(cat.id)}
                            className="p-0.5 text-[#5c4a37]/30 dark:text-amber-100/30 hover:text-red-600"><Trash2 size={9} /></button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className={`flex-1 py-2 px-4 font-semibold rounded-xl transition disabled:cursor-not-allowed text-white ${tipo === 'receita' ? 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400' : 'bg-red-600 hover:bg-red-500 disabled:bg-red-400'}`}>
              {saving ? 'Salvando...' : editMode ? 'Salvar Alterações' : tipo === 'receita' ? 'Salvar Receita' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
