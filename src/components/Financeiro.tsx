import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { LancamentoFinanceiro } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Filter, X, AlertTriangle } from 'lucide-react';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface FinanceiroProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Financeiro({ store, onUpdate }: FinanceiroProps) {
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LancamentoFinanceiro | null>(null);

  const lancamentosFiltrados = filtroTipo === 'todas'
    ? store.lancamentos
    : store.lancamentos.filter(l => l.tipo === filtroTipo);

  const receitas = store.lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const despesas = store.lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  const saldo = receitas - despesas;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">Financeiro</h2>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Receitas, despesas e fluxo de caixa</p>
        </div>
        {store.hasPermission('financeiro.lancar') && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition">
            <Plus size={18} /> Novo Lançamento
          </button>
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

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[#5c4a37]/60 dark:text-amber-100/50" />
        {(['todas', 'receita', 'despesa'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              filtroTipo === t
                ? 'bg-amber-600 text-white'
                : 'bg-[#f0eade] dark:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70 hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b]'
            }`}>
            {t === 'todas' ? 'Todas' : t === 'receita' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1a1208] rounded-2xl border border-[#ebdcc9] dark:border-[#2e1a0a] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead className="bg-[#f8f5ee] dark:bg-[#130b04]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Pagamento</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider">Valor</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#5c4a37] dark:text-amber-100/60 uppercase tracking-wider" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ebdcc9] dark:divide-[#2e1a0a]">
            {lancamentosFiltrados.map(l => (
              <tr key={l.id} className="hover:bg-[#f8f5ee]/50 dark:hover:bg-[#130b04]/50 transition">
                <td className="px-4 py-3 text-xs text-[#5c4a37] dark:text-amber-100/70 font-mono">
                  {new Date(l.data_lancamento).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 font-medium text-[#2e2315] dark:text-amber-50">{l.descricao || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 rounded-lg bg-[#f0eade] dark:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70">
                    {store.categoriaFinanceiroNome(l.categoria_id)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[#5c4a37] dark:text-amber-100/70">{l.forma_pagamento || '—'}</td>
                <td className={`px-4 py-3 text-right text-sm font-bold font-mono ${l.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{brl(l.valor)}
                </td>
                {store.hasPermission('financeiro.lancar') && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDeleteConfirm(l)}
                      className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[#5c4a37]/40 dark:text-amber-100/30 hover:text-red-600 dark:hover:text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {lancamentosFiltrados.length === 0 && (
          <div className="p-8 text-center text-[#5c4a37]/60 dark:text-amber-100/50">Nenhum lançamento encontrado</div>
        )}
      </div>

      {showModal && <NovoLancamentoModal store={store} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); onUpdate(); }} />}

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

function NovoLancamentoModal({ store, onClose, onSaved }: { store: MiniFactoryStore; onClose: () => void; onSaved: () => void }) {
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('receita');
  const [categoriaId, setCategoriaId] = useState(1);
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [dataLancamento, setDataLancamento] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const categorias = store.categoriasFinanceiro.filter(c => c.tipo === tipo);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) { setError('Valor inválido'); return; }
    setSaving(true);
    await store.addLancamentoFinanceiro({
      data_lancamento: dataLancamento,
      valor: valorNum,
      tipo,
      categoria_id: categoriaId,
      descricao: descricao || undefined,
      forma_pagamento: formaPagamento || undefined,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-md w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#2e2315] dark:text-amber-50">Novo Lançamento</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#f0eade] dark:hover:bg-[#130b04] text-[#5c4a37] dark:text-amber-100/70">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-2">Tipo</label>
            <div className="flex gap-2">
              {(['receita', 'despesa'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setTipo(t); setCategoriaId(store.categoriasFinanceiro.filter(c => c.tipo === t)[0]?.id || 1); }}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold transition border ${
                    tipo === t
                      ? t === 'receita'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                      : 'bg-[#f8f5ee] dark:bg-[#130b04] border-[#ebdcc9] dark:border-[#2e1a0a] text-[#5c4a37] dark:text-amber-100/70'
                  }`}>
                  {t === 'receita' ? 'Receita' : 'Despesa'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Categoria</label>
              <select value={categoriaId} onChange={e => setCategoriaId(Number(e.target.value))} required
                className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Pagamento</label>
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Selecione</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="cartao_credito">Crédito</option>
                <option value="cartao_debito">Débito</option>
                <option value="boleto">Boleto</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Valor</label>
              <input type="text" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} required placeholder="0,00"
                className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Data</label>
              <input type="date" value={dataLancamento} onChange={e => setDataLancamento(e.target.value)} required
                className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5c4a37] dark:text-amber-100 mb-1">Descrição</label>
            <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do lançamento"
              className="w-full px-3 py-2 bg-[#f8f5ee] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#2e2315] dark:text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 px-4 border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-xl text-[#5c4a37] dark:text-amber-100 font-medium hover:bg-[#f8f5ee] dark:hover:bg-[#130b04] transition">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-400 text-white font-semibold rounded-xl transition disabled:cursor-not-allowed">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
