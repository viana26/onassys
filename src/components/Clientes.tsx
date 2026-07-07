import React, { useState } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Cliente } from '../types';
import { phoneMask } from '../lib/mask';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  X, 
  PlusCircle, 
  Notebook,
  Building,
  Sparkles,
  Users,
  AlertTriangle
} from 'lucide-react';

interface ClientesProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
}

export default function Clientes({ store, onUpdate }: ClientesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  // Form states
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  const [nome, setNome] = useState('');
  const [tipoId, setTipoId] = useState<number>(1);
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const filteredClientes = store.clientes.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.telefone.includes(searchTerm) || 
                          c.endereco.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (typeFilter !== 'todos') {
      return matchesSearch && c.tipo_id === Number(typeFilter);
    }
    return matchesSearch;
  });

  const handleOpenNew = () => {
    setIsOpenForm(true);
    setEditId(null);
    setNome('');
    setTipoId(1);
    setTelefone('');
    setEmail('');
    setEndereco('');
    setObservacoes('');
  };

  const handleOpenEdit = (c: Cliente) => {
    setIsOpenForm(true);
    setEditId(c.id);
    setNome(c.nome);
    setTipoId(c.tipo_id);
    setTelefone(c.telefone);
    setEmail(c.email);
    setEndereco(c.endereco);
    setObservacoes(c.observacoes || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Favor preencher o nome do cliente.');
      return;
    }

    if (editId) {
      store.updateCliente(editId, {
        nome,
        tipo_id: tipoId,
        telefone,
        email,
        endereco,
        observacoes
      });
    } else {
      store.addCliente({
        nome,
        tipo_id: tipoId,
        telefone,
        email,
        endereco,
        observacoes
      });
    }

    setIsOpenForm(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-amber-800 dark:text-amber-400 text-xs font-semibold font-mono tracking-wider uppercase">Módulo de Cadastros</span>
          <h1 className="text-2xl font-semibold font-display tracking-tight text-amber-950 dark:text-amber-100">Carteira de Clientes</h1>
          <p className="text-sm text-amber-900/60 dark:text-amber-100/40 mt-1">Monitore quem compra seus salgadinhos de festa, bolos e doces. Registre contatos e locais de entrega rápida.</p>
        </div>

        <button 
          onClick={handleOpenNew}
          disabled={!store.hasPermission('clientes.criar')}
          className={`${store.hasPermission('clientes.criar') ? 'bg-amber-700 hover:bg-amber-600 dark:bg-amber-800 dark:hover:bg-amber-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'} shadow-sm text-white text-xs font-semibold font-sans py-2.5 px-4 rounded-xl transition flex items-center gap-1.5 self-start sm:self-center justify-center font-medium`}
        >
          <PlusCircle size={16} /> Novo Cliente
        </button>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white dark:bg-[#150f09] p-4 rounded-xl border border-amber-100 dark:border-[#22160b] shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-amber-200/40">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone, endereço..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-orange-50/20 dark:bg-[#1c140c] border border-amber-100 dark:border-[#2b1d10] text-amber-950 dark:text-amber-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-700 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
          {[{ label: 'Todos', value: 'todos' }, ...store.tiposCliente.map(t => ({ label: t.nome, value: String(t.id) }))].map(filter => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border transition ${
                typeFilter === filter.value 
                  ? 'bg-amber-800 dark:bg-amber-700 text-white border-amber-800 dark:border-amber-700' 
                  : 'bg-white dark:bg-[#1c140c] text-gray-500 dark:text-amber-200/50 border-amber-100 dark:border-[#2b1d10] hover:bg-amber-50 dark:hover:bg-amber-950'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of customer sheets */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white dark:bg-[#150f09] rounded-2xl py-12 border border-amber-100 dark:border-[#22160b] text-center text-gray-500 dark:text-amber-200/40">
          <Users size={36} className="mx-auto text-amber-600/30 mb-2" />
          <p className="text-sm font-medium text-amber-950 dark:text-amber-200">Nenhum cliente cadastrado.</p>
          <p className="text-xs text-gray-400 dark:text-amber-100/35 mt-1">Adicione o primeiro comprador clicando em '+ Novo Cliente'.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="customers-grid">
          {filteredClientes.map(c => {
            const hasPedidosCount = store.pedidos.filter(p => p.cliente_id === c.id).length;
            return (
              <div 
                key={c.id} 
                className="bg-white dark:bg-[#150f09] rounded-xl border border-amber-100 dark:border-[#22160b] p-3 shadow-sm hover:border-amber-200 dark:hover:border-amber-800 transition flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-wider leading-tight ${
                        (store.tipoClienteNome(c.tipo_id).toLowerCase().includes('lanchonete') ? 'bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-250 dark:border-[#382613]' :
                        store.tipoClienteNome(c.tipo_id).toLowerCase().includes('evento') || store.tipoClienteNome(c.tipo_id).toLowerCase().includes('buffet') ? 'bg-pink-100 text-pink-800 border border-pink-200 dark:bg-pink-950/30 dark:text-pink-350 dark:border-[#4d1624]' :
                        store.tipoClienteNome(c.tipo_id).toLowerCase().includes('particular') ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-[#1d164d]' :
                        'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700')
                      }`}>
                        {store.tipoClienteNome(c.tipo_id)}
                      </span>
                      <h3 className="font-semibold text-sm font-display text-amber-950 dark:text-amber-100 truncate">{c.nome}</h3>
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-amber-100/40 font-mono whitespace-nowrap mt-0.5">
                      {hasPedidosCount} pedidos
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-amber-950 dark:text-amber-200">
                    {c.telefone && (
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-amber-100/60">
                        <Phone size={10} className="text-amber-800 dark:text-amber-500 flex-shrink-0" />
                        <span className="font-mono truncate">{c.telefone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-amber-100/60">
                        <Mail size={10} className="text-amber-800 dark:text-amber-400 flex-shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.endereco && (
                      <div className="flex items-start gap-1.5 text-gray-600 dark:text-amber-100/60">
                        <MapPin size={10} className="text-amber-800 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{c.endereco}</span>
                      </div>
                    )}
                    {c.observacoes && (
                      <div className="bg-amber-50/40 dark:bg-amber-950/20 px-2 py-1 rounded-md border border-amber-50 dark:border-amber-950/30 text-gray-500 dark:text-amber-300/70 flex items-start gap-1">
                        <Notebook size={10} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{c.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-amber-50/50 dark:border-[#22160b]/40 pt-2">
                  <button 
                    onClick={() => setDeleteConfirm({ id: c.id, name: c.nome })}
                    disabled={!store.hasPermission('clientes.excluir')}
                    className={`${store.hasPermission('clientes.excluir') ? 'hover:bg-red-50 dark:hover:bg-red-950/20' : 'opacity-40 cursor-not-allowed'} p-1 rounded-lg text-red-500 transition text-[10px] flex items-center gap-1 font-semibold`}
                  >
                    <Trash2 size={11} /> Deletar
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(c)}
                    disabled={!store.hasPermission('clientes.editar')}
                    className={`${store.hasPermission('clientes.editar') ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900' : 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-50'} text-amber-950 dark:text-amber-200 font-bold px-2.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 transition`}
                  >
                    <Edit3 size={10} /> Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLIENT CRUD MODAL */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 text-xs font-sans animate-none" id="modal-client">
          <div className="bg-white dark:bg-[#120c06] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom border-t border-amber-100 dark:border-[#2d1e0d]">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-amber-950 dark:text-amber-100">
                {editId ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
              </h3>
              <button 
                onClick={() => setIsOpenForm(false)}
                className="text-gray-400 hover:text-amber-950 dark:hover:text-amber-200 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              
              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Nome / Razão Social ou Particular *</label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lanchonete Central d'Oeste, Maria Helena"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium">Tipo de Cliente *</label>
                  <select 
                    value={tipoId}
                    onChange={(e) => setTipoId(Number(e.target.value))}
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-200"
                  >
                    {store.tiposCliente.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-amber-950 dark:text-amber-100 font-medium font-sans">Telefone / WhatsApp</label>
                  <input 
                    type="tel" 
                    value={telefone}
                    onChange={(e) => setTelefone(phoneMask(e.target.value))}
                    placeholder="Ex: (11) 98888-7777"
                    className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Endereço de Correspondência ou Entrega</label>
                <input 
                  type="text" 
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rua das Rosas, 742 - Jardim Paulista"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Endereço de E-mail</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: contato@lanchonete.com"
                  className="w-full p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-amber-950 dark:text-amber-100 font-medium">Observações Importantes de Entrega / Horários</label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Entregar somente no portão lateral de carga. Atender até as 11:30h."
                  className="w-full h-16 p-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 placeholder:text-gray-400 dark:placeholder:text-amber-200/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2.5 rounded-xl text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-700 hover:bg-amber-800 dark:bg-amber-800 dark:hover:bg-amber-750 text-white font-semibold py-2.5 rounded-xl text-center shadow"
                >
                  Confirmar Cadastro
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
              <h3 className="text-lg font-bold text-amber-950 dark:text-amber-50">Excluir Cliente?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-amber-100/70 mb-2">
              O cliente <strong>"{deleteConfirm.name}"</strong> será excluído permanentemente junto com <strong>TODOS os pedidos históricos</strong> associados.
            </p>
            <p className="text-xs text-gray-400 dark:text-amber-100/40 mb-4">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#2e1a0a] rounded-xl text-gray-600 dark:text-amber-100 font-medium hover:bg-gray-50 dark:hover:bg-[#130b04] transition">
                Cancelar
              </button>
              <button onClick={async () => { store.deleteCliente(deleteConfirm.id); setDeleteConfirm(null); onUpdate(); }}
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
