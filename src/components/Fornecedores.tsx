import React, { useState, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Fornecedor } from '../types';
import { phoneMask } from '../lib/mask';
import { useSortableData } from '../lib/hooks/useSortableData';
import { SortButton } from './SortButton';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  PlusCircle, 
  Building,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface FornecedoresProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Fornecedores({ store, onUpdate }: FornecedoresProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInativos, setShowInativos] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<Fornecedor | null>(null);

  const filtered = useMemo(() => {
    return store.fornecedores.filter(f => {
      if (!showInativos && f.ativo === false) return false;
      return f.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.contato || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.telefone || '').includes(searchTerm);
    });
  }, [store.fornecedores, searchTerm, showInativos]);

  const { sortedItems: sortedFornecedores, requestSort, sortConfig } = useSortableData(filtered, 'nome_fantasia');

  const totalPages = Math.max(1, Math.ceil(sortedFornecedores.length / pageSize));
  const paginatedFornecedores = sortedFornecedores.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSearchChange = (v: string) => {
    setSearchTerm(v);
    setCurrentPage(1);
  };

  const handleToggleInativos = () => {
    setShowInativos(v => !v);
    setCurrentPage(1);
  };

  const materiaisDoFornecedor = (fornecedorId: number) =>
    store.materiais.filter(m => m.fornecedor_id === fornecedorId);

  const handleOpenNew = () => {
    setIsFormOpen(true);
    setEditId(null);
    setNomeFantasia('');
    setContato('');
    setTelefone('');
    setEmail('');
  };

  const handleOpenEdit = (f: Fornecedor) => {
    setIsFormOpen(true);
    setEditId(f.id);
    setNomeFantasia(f.nome_fantasia);
    setContato(f.contato || '');
    setTelefone(f.telefone || '');
    setEmail(f.email || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFantasia.trim()) return;

    if (editId) {
      await store.updateFornecedor(editId, {
        nome_fantasia: nomeFantasia.trim(),
        contato: contato.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } else {
      await store.addFornecedor({
        nome_fantasia: nomeFantasia.trim(),
        contato: contato.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
      });
    }

    setIsFormOpen(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const materiaisVinculados = materiaisDoFornecedor(deleteConfirm.id);
    if (materiaisVinculados.length > 0) {
      alert(`O fornecedor "${deleteConfirm.nome_fantasia}" não pode ser excluído porque está vinculado a ${materiaisVinculados.length} ingrediente(s):\n\n${materiaisVinculados.map(m => `- ${m.nome}`).join('\n')}\n\nRemova o vínculo nos ingredientes primeiro.`);
      setDeleteConfirm(null);
      return;
    }
    await store.deleteFornecedor(deleteConfirm.id);
    setDeleteConfirm(null);
    onUpdate();
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building size={20} className="text-amber-700 dark:text-amber-400" />
            <h1 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Fornecedores</h1>
          </div>
          <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50 mt-1">Gerencie seus fornecedores de insumos e matérias-primas.</p>
        </div>

        <button
          onClick={handleOpenNew}
          disabled={!store.hasPermission('fornecedores.criar')}
          className={`${store.hasPermission('fornecedores.criar') ? 'bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'} shadow-sm text-white text-xs font-semibold font-sans py-2 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center`}
        >
          <PlusCircle size={15} /> Novo Fornecedor
        </button>
      </div>

      <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-amber-200/40">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Buscar por nome, contato ou telefone..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 h-9 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1c140c] border border-amber-100 dark:border-[#2b1d10] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-700 transition"
          />
        </div>
        <button
          onClick={handleToggleInativos}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
            showInativos
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
          }`}
        >
          {showInativos ? 'Mostrando inativos' : 'Ocultar inativos'}
        </button>
      </div>

      {sortedFornecedores.length === 0 ? (
        <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500 dark:text-amber-200/40">
          <Building size={36} className="mx-auto text-amber-600/30 mb-2" />
          <p className="text-sm font-medium text-amber-950 dark:text-amber-200">Nenhum fornecedor encontrado.</p>
          <p className="text-xs text-gray-400 dark:text-amber-100/35 mt-1">Adicione o primeiro fornecedor clicando em '+ Novo Fornecedor'.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-[#150f09] rounded-2xl border border-amber-100 dark:border-[#22160b] shadow-sm overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100 border-b border-amber-100 dark:border-[#22160b]">
                  <th className="p-3 pl-4 whitespace-nowrap"><SortButton sortKey="nome_fantasia" label="Fornecedor" onSort={requestSort} sortConfig={sortConfig} /></th>
                  <th className="p-3 whitespace-nowrap"><SortButton sortKey="contato" label="Contato" onSort={requestSort} sortConfig={sortConfig} /></th>
                  <th className="p-3 whitespace-nowrap"><SortButton sortKey="telefone" label="Telefone" onSort={requestSort} sortConfig={sortConfig} /></th>
                  <th className="p-3 whitespace-nowrap"><SortButton sortKey="email" label="Email" onSort={requestSort} sortConfig={sortConfig} /></th>
                  <th className="p-3 whitespace-nowrap"><SortButton sortKey="ativo" label="Status" onSort={requestSort} sortConfig={sortConfig} /></th>
                  <th className="p-3 text-right whitespace-nowrap">Materiais</th>
                  <th className="p-3 text-right pr-4 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFornecedores.map(f => {
                  const materiais = materiaisDoFornecedor(f.id);
                  return (
                    <tr key={f.id} className={`border-b border-amber-50/50 dark:border-[#22160b]/40 transition ${
                      f.ativo === false ? 'bg-gray-50/50 dark:bg-gray-900/20 opacity-60' : 'hover:bg-amber-50/20 dark:hover:bg-amber-950/10'
                    }`}>
                      <td className="p-3 pl-4 font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap">{f.nome_fantasia}</td>
                      <td className="p-3 text-gray-600 dark:text-amber-100/60 whitespace-nowrap">{f.contato || '—'}</td>
                      <td className="p-3 text-gray-600 dark:text-amber-100/60 whitespace-nowrap font-mono">{f.telefone || '—'}</td>
                      <td className="p-3 text-gray-600 dark:text-amber-100/60 whitespace-nowrap">{f.email || '—'}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          f.ativo === false
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                            : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {f.ativo === false ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${
                          materiais.length > 0
                            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}>
                          {materiais.length} {materiais.length === 1 ? 'item' : 'itens'}
                        </span>
                      </td>
                      <td className="p-3 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {store.hasPermission('fornecedores.editar') && (
                            <button
                              onClick={() => store.toggleFornecedorAtivo(f.id)}
                              className={`p-1.5 rounded-lg transition ${
                                f.ativo === false
                                  ? 'hover:bg-emerald-100 dark:hover:bg-emerald-950/30 text-gray-400 hover:text-emerald-600'
                                  : 'hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-600 hover:text-amber-800'
                              }`}
                              title={f.ativo === false ? 'Ativar' : 'Desativar'}
                              aria-label={f.ativo === false ? 'Ativar fornecedor' : 'Desativar fornecedor'}
                            >
                              {f.ativo === false ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                            </button>
                          )}
                          {store.hasPermission('fornecedores.editar') && (
                            <button
                              onClick={() => handleOpenEdit(f)}
                              className="hover:bg-amber-100 dark:hover:bg-amber-950 p-1.5 rounded-lg text-amber-900 dark:text-amber-200 transition"
                              aria-label="Editar fornecedor"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {store.hasPermission('fornecedores.excluir') && (
                            <button
                              onClick={() => setDeleteConfirm(f)}
                              className="hover:bg-red-100 dark:hover:bg-red-950/30 p-1.5 rounded-lg text-red-500 dark:text-red-400 transition"
                              aria-label="Excluir fornecedor"
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

          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {paginatedFornecedores.map(f => {
              const materiais = materiaisDoFornecedor(f.id);
              return (
                <div key={f.id} className={`bg-white dark:bg-[#150f09] rounded-2xl border p-4 shadow-sm ${
                  f.ativo === false ? 'border-gray-200 dark:border-gray-800 opacity-60' : 'border-amber-100 dark:border-[#22160b]'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm text-amber-950 dark:text-amber-100">{f.nome_fantasia}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold mt-1 ${
                        f.ativo === false
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                          : 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {f.ativo === false ? 'Inativo' : 'Ativo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {store.hasPermission('fornecedores.editar') && (
                        <button onClick={() => store.toggleFornecedorAtivo(f.id)}
                          className={`p-1.5 rounded-lg transition ${f.ativo === false ? 'text-gray-400 hover:text-emerald-600' : 'text-amber-600 hover:text-amber-800'}`}
                          aria-label={f.ativo === false ? 'Ativar fornecedor' : 'Desativar fornecedor'}>
                          {f.ativo === false ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                        </button>
                      )}
                      {store.hasPermission('fornecedores.editar') && (
                        <button onClick={() => handleOpenEdit(f)}
                          className="p-1.5 rounded-lg text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950 transition"
                          aria-label="Editar fornecedor">
                          <Edit3 size={16} />
                        </button>
                      )}
                      {store.hasPermission('fornecedores.excluir') && (
                        <button onClick={() => setDeleteConfirm(f)}
                          className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition"
                          aria-label="Excluir fornecedor">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-amber-100/60">
                    {f.contato && <p><span className="font-medium">Contato:</span> {f.contato}</p>}
                    {f.telefone && <p><span className="font-medium">Tel:</span> {f.telefone}</p>}
                    {f.email && <p><span className="font-medium">Email:</span> {f.email}</p>}
                  </div>
                  {materiais.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-50 dark:border-[#22160b]/40">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg">
                        {materiais.length} {materiais.length === 1 ? 'material' : 'materiais'} vinculado{materiais.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
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
        </>
      )}

      {isFormOpen && (store.hasPermission('fornecedores.criar') || store.hasPermission('fornecedores.editar')) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                {editId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Nome Fantasia *</label>
                <input
                  type="text"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  placeholder="Ex: Distribuidora de Alimentos Ltda"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Nome do Contato</label>
                <input
                  type="text"
                  value={contato}
                  onChange={(e) => setContato(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">Telefone</label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(phoneMask(e.target.value))}
                    placeholder="Ex: (11) 98888-7777"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: contato@fornecedor.com"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-semibold py-2.5 rounded-xl text-center shadow"
                >
                  {editId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
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
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Excluir Fornecedor?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              O fornecedor <strong>"{deleteConfirm.nome_fantasia}"</strong> será excluído permanentemente.
            </p>
            {materiaisDoFornecedor(deleteConfirm.id).length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-2">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <AlertTriangle size={12} /> Este fornecedor está vinculado a {materiaisDoFornecedor(deleteConfirm.id).length} ingrediente(s)
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">Remova o vínculo nos ingredientes antes de excluir.</p>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={handleDelete}
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
