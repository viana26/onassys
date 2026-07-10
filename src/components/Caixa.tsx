import React, { useState, useRef } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Wallet, Search, DollarSign, TrendingUp, TrendingDown, Printer, X, CheckCircle2, AlertTriangle, Clock, User, CreditCard, Banknote, Smartphone, Landmark, ArrowLeftRight } from 'lucide-react';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface ComprovanteData {
  tipo: 'pagamento' | 'receita' | 'despesa';
  pedidoId?: string;
  clienteNome?: string;
  descricao: string;
  valor: number;
  valorRecebido?: number;
  troco?: number;
  formaPagamento: string;
  dataLancamento: string;
  saldoRestante?: number;
}

interface CaixaProps {
  store: MiniFactoryStore;
  onUpdate: () => void;
  preselectedPedidoId?: string;
  onClearPreselected?: () => void;
  appName?: string;
}

const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro', icon: <Banknote size={20} />, color: 'bg-emerald-600 hover:bg-emerald-500' },
  { value: 'pix', label: 'Pix', icon: <Smartphone size={20} />, color: 'bg-blue-600 hover:bg-blue-500' },
  { value: 'cartao_credito', label: 'Crédito', icon: <CreditCard size={20} />, color: 'bg-violet-600 hover:bg-violet-500' },
  { value: 'cartao_debito', label: 'Débito', icon: <CreditCard size={20} />, color: 'bg-indigo-600 hover:bg-indigo-500' },
  { value: 'transferencia', label: 'Transf.', icon: <Landmark size={20} />, color: 'bg-slate-600 hover:bg-slate-500' },
];

function ComprovanteModal({ data, appName, onClose }: {
  data: ComprovanteData;
  appName: string;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`
      <html>
      <head>
        <title>Comprovante - ${appName}</title>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; color: #000; }
          .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .header p { margin: 2px 0; font-size: 10px; color: #555; }
          .title { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0; }
          .linha { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .label { font-weight: bold; }
          .valor { font-weight: bold; font-size: 14px; }
          .troco { color: #d00; font-weight: bold; font-size: 13px; }
          .pago { color: #080; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${appName}</h2>
          <p>Comprovante de Caixa</p>
        </div>
        <div class="title">
          ${data.tipo === 'pagamento' ? 'COMPROVANTE DE PAGAMENTO' : data.tipo === 'receita' ? 'COMPROVANTE DE RECEITA' : 'COMPROVANTE DE DESPESA'}
        </div>
        ${data.pedidoId ? `<div class="row"><span class="label">Pedido:</span><span>#${data.pedidoId.slice(-6)}</span></div>` : ''}
        ${data.clienteNome ? `<div class="row"><span class="label">Cliente:</span><span>${data.clienteNome}</span></div>` : ''}
        <div class="row"><span class="label">Data:</span><span>${new Date(data.dataLancamento + (data.dataLancamento.includes('T') ? '' : 'T12:00')).toLocaleString('pt-BR')}</span></div>
        <div class="row"><span class="label">Descrição:</span><span>${data.descricao}</span></div>
        <div class="linha"></div>
        ${data.tipo === 'pagamento' ? `
          <div class="row"><span class="label">Valor Recebido:</span><span class="valor">${brl(data.valorRecebido || data.valor)}</span></div>
          ${data.troco ? `<div class="row troco"><span class="label">Troco:</span><span>${brl(data.troco)}</span></div>` : ''}
          <div class="row"><span class="label">Valor Líquido:</span><span>${brl(data.valor)}</span></div>
        ` : `
          <div class="row"><span class="label">Valor:</span><span class="valor">${brl(data.valor)}</span></div>
        `}
        <div class="row"><span class="label">Forma de Pagamento:</span><span>${data.formaPagamento.toUpperCase()}</span></div>
        <div class="linha"></div>
        ${data.saldoRestante !== undefined && data.saldoRestante <= 0 ? '<div class="row pago"><span>Status: PAGO ✓</span></div>' : data.saldoRestante !== undefined ? `<div class="row"><span class="label">Saldo Restante:</span><span>${brl(data.saldoRestante)}</span></div>` : ''}
        <div class="footer">Obrigado pela preferência!</div>
        <div style="text-align:center;margin-top:8px;font-size:9px;color:#999;">${new Date().toLocaleString('pt-BR')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
  };

  const formaNome = FORMAS_PAGAMENTO.find(f => f.value === data.formaPagamento)?.label || data.formaPagamento;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#120c06] max-w-sm w-full rounded-2xl shadow-2xl border border-amber-100 dark:border-[#2d1e0d] overflow-hidden">
        <div ref={printRef} className="p-6 font-mono text-xs space-y-2">
          <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
            <h2 className="font-bold text-base uppercase tracking-wider text-amber-950 dark:text-amber-100">{appName}</h2>
            <p className="text-[9px] text-gray-400">Comprovante de Caixa</p>
          </div>

          <p className="text-center font-bold text-sm text-amber-900 dark:text-amber-100">
            {data.tipo === 'pagamento' ? 'COMPROVANTE DE PAGAMENTO' : data.tipo === 'receita' ? 'COMPROVANTE DE RECEITA' : 'COMPROVANTE DE DESPESA'}
          </p>

          <div className="space-y-1.5 border-t border-dashed border-gray-200 pt-3">
            {data.pedidoId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Pedido:</span>
                <span className="font-bold text-amber-950 dark:text-amber-100">#{data.pedidoId.slice(-6)}</span>
              </div>
            )}
            {data.clienteNome && (
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-bold text-amber-950 dark:text-amber-100">{data.clienteNome}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Data:</span>
              <span className="text-amber-950 dark:text-amber-100">
                {new Date(data.dataLancamento + (data.dataLancamento.includes('T') ? '' : 'T12:00')).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Descrição:</span>
              <span className="text-amber-950 dark:text-amber-100 text-right max-w-[200px]">{data.descricao}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
            {data.tipo === 'pagamento' && data.valorRecebido ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor Recebido:</span>
                  <span className="font-bold text-emerald-700">{brl(data.valorRecebido)}</span>
                </div>
                {data.troco ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Troco:</span>
                    <span className="font-bold text-red-500">{brl(data.troco)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-sm border-t border-dashed border-gray-200 pt-1.5">
                  <span className="text-gray-500">Valor Líquido:</span>
                  <span className="font-bold text-emerald-700">{brl(data.valor)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Valor:</span>
                <span className={`font-bold ${data.tipo === 'despesa' ? 'text-red-600' : 'text-emerald-700'}`}>
                  {data.tipo === 'despesa' ? '-' : ''}{brl(data.valor)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Forma:</span>
              <span className="font-bold text-amber-950 dark:text-amber-100 uppercase">{formaNome}</span>
            </div>
          </div>

          {data.saldoRestante !== undefined && (
            <div className="border-t border-dashed border-gray-200 pt-2 text-center">
              {data.saldoRestante <= 0 ? (
                <span className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-1">
                  <CheckCircle2 size={14} /> PAGO ✓
                </span>
              ) : (
                <span className="text-amber-700 font-bold text-xs">
                  Saldo Restante: {brl(data.saldoRestante)}
                </span>
              )}
            </div>
          )}

          <div className="text-center pt-3 border-t border-dashed border-gray-200 text-gray-400 text-[9px]">
            Obrigado pela preferência!
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-amber-100 dark:border-[#2d1e0d] bg-amber-50/30 dark:bg-[#0c0703]">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-amber-950 dark:text-amber-100 transition flex items-center justify-center gap-1.5">
            <X size={14} /> Fechar
          </button>
          <button onClick={handlePrint} className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
            <Printer size={14} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Caixa({ store, onUpdate, preselectedPedidoId, onClearPreselected, appName }: CaixaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(preselectedPedidoId || null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [showReceitaLivre, setShowReceitaLivre] = useState(false);
  const [showDespesaRapida, setShowDespesaRapida] = useState(false);

  // Receita livre fields
  const [livreValor, setLivreValor] = useState('');
  const [livreDescricao, setLivreDescricao] = useState('');
  const [livreForma, setLivreForma] = useState('pix');
  const [livreData, setLivreData] = useState(new Date().toISOString().split('T')[0]);

  // Despesa fields
  const [despValor, setDespValor] = useState('');
  const [despDescricao, setDespDescricao] = useState('');
  const [despForma, setDespForma] = useState('pix');
  const [despData, setDespData] = useState(new Date().toISOString().split('T')[0]);

  // Comprovante
  const [comprovanteData, setComprovanteData] = useState<ComprovanteData | null>(null);

  const pedidos = store.pedidos.filter(p => {
    if (p.status_id === 1 || p.status_id === 6) return false;
    const recebido = store.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
    return p.valor_total - recebido > 0;
  });

  const pedidosFiltrados = searchTerm
    ? store.pedidos.filter(p => {
        if (p.status_id === 6) return false;
        const cli = store.clientes.find(c => c.id === p.cliente_id);
        const nome = cli?.nome?.toLowerCase() || '';
        return nome.includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : pedidos.slice(0, 20);

  const selectedPedido = selectedPedidoId ? store.pedidos.find(p => p.id === selectedPedidoId) : null;
  const selectedCliente = selectedPedido ? store.clientes.find(c => c.id === selectedPedido.cliente_id) : null;
  const recebimentos = selectedPedido
    ? store.lancamentos.filter(l => l.pedido_id === selectedPedido.id && l.tipo === 'receita')
    : [];
  const totalRecebido = recebimentos.reduce((s, l) => s + l.valor, 0);
  const saldoRestante = selectedPedido ? selectedPedido.valor_total - totalRecebido : 0;
  const isPago = saldoRestante <= 0;

  const valorNumerico = parseFloat((paymentAmount || '0').replace(',', '.'));
  const troco = formaPagamento === 'dinheiro' && valorNumerico > saldoRestante ? valorNumerico - saldoRestante : 0;
  const valorRegistrar = troco > 0 ? saldoRestante : (valorNumerico > saldoRestante ? saldoRestante : valorNumerico);

  const hoje = new Date().toISOString().split('T')[0];
  const lancamentosHoje = store.lancamentos.filter(l => l.data_lancamento.startsWith(hoje));
  const receitasHoje = lancamentosHoje.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const despesasHoje = lancamentosHoje.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);

  const handleSelectPedido = (id: string) => {
    setSelectedPedidoId(id);
    const p = store.pedidos.find(ped => ped.id === id);
    const recebido = p
      ? store.lancamentos.filter(l => l.pedido_id === id && l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
      : 0;
    setPaymentAmount((p ? p.valor_total - recebido : 0).toFixed(2));
    setFormaPagamento('pix');
    if (onClearPreselected) onClearPreselected();
  };

  const handleReceberPagamento = async () => {
    if (!store.hasPermission('financeiro.lancar')) return;
    if (!selectedPedidoId || valorNumerico <= 0) return;
    const validaValor = valorNumerico > saldoRestante ? saldoRestante : valorNumerico;
    await store.registrarPagamentoPedido(selectedPedidoId, validaValor, formaPagamento, new Date().toISOString());
    setComprovanteData({
      tipo: 'pagamento',
      pedidoId: selectedPedidoId,
      clienteNome: selectedCliente?.nome,
      descricao: `Pagamento pedido #${selectedPedidoId.slice(-6)} - ${selectedCliente?.nome || ''}`,
      valor: validaValor,
      valorRecebido: troco > 0 ? valorNumerico : undefined,
      troco: troco > 0 ? troco : undefined,
      formaPagamento,
      dataLancamento: new Date().toISOString(),
      saldoRestante: saldoRestante - validaValor,
    });
    setPaymentAmount('');
    onUpdate();
  };

  const handleNovaReceita = async () => {
    if (!store.hasPermission('financeiro.lancar')) return;
    const val = parseFloat((livreValor || '0').replace(',', '.'));
    if (!val || val <= 0 || !livreDescricao) return;
    const catReceita = store.categoriasFinanceiro.find(c => c.tipo === 'receita');
    await store.addLancamentoFinanceiro({
      data_lancamento: livreData,
      valor: val,
      tipo: 'receita',
      categoria_id: catReceita?.id || 1,
      descricao: livreDescricao,
      forma_pagamento: livreForma,
    });
    setComprovanteData({
      tipo: 'receita',
      descricao: livreDescricao,
      valor: val,
      formaPagamento: livreForma,
      dataLancamento: livreData + 'T12:00',
    });
    setLivreValor('');
    setLivreDescricao('');
    setShowReceitaLivre(false);
    onUpdate();
  };

  const handleCriarPedidoTeste = async () => {
    if (!store.hasPermission('financeiro.lancar')) return;
    // Seed a test client
    let clienteId = store.clientes.find(c => c.nome === 'Cliente Teste')?.id;
    if (!clienteId) {
      const cli = await store.addCliente({ nome: 'Cliente Teste', tipo_id: 1, telefone: '(11) 99999-0000' });
      clienteId = cli.id;
    }
    // Seed a test pedido
    const produtos = store.produtos.filter(p => p.ativo);
    const prod = produtos[0] || (await (async () => {
      const catId = store.categorias[0]?.id || 1;
      const uniId = store.unidades[0]?.id || 1;
      return await store.addProduto({ nome: 'Coxinha Teste', categoria_id: catId, descricao: 'Teste', unidade_producao_id: uniId, tempo_producao_minutos: 10, custo_producao_calculado: 5, ativo: true, margem_lucro: 50, preco_venda: 15 });
    })());
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
    const pedido = await store.addPedido({ cliente_id: clienteId, status_id: 2, data_entrega_prevista: amanha.toISOString().split('T')[0] + 'T16:00', observacoes: 'Pedido de teste para caixa', criado_by: 'Caixa' });
    await store.addItemPedido({ pedido_id: pedido.id, produto_id: prod.id, quantidade_solicitada: 10, quantidade_produzida: 0, preco_unitario: 15.00 });
    handleSelectPedido(pedido.id);
    onUpdate();
  };

  const handleNovaDespesa = async () => {
    if (!store.hasPermission('financeiro.lancar')) return;
    const val = parseFloat((despValor || '0').replace(',', '.'));
    if (!val || val <= 0 || !despDescricao) return;
    const catDespesa = store.categoriasFinanceiro.find(c => c.tipo === 'despesa');
    await store.addLancamentoFinanceiro({
      data_lancamento: despData,
      valor: val,
      tipo: 'despesa',
      categoria_id: catDespesa?.id || 2,
      descricao: despDescricao,
      forma_pagamento: despForma,
    });
    setComprovanteData({
      tipo: 'despesa',
      descricao: despDescricao,
      valor: val,
      formaPagamento: despForma,
      dataLancamento: despData + 'T12:00',
    });
    setDespValor('');
    setDespDescricao('');
    setShowDespesaRapida(false);
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={22} className="text-amber-700" />
          <div>
            <h2 className="text-xl font-bold text-[#2e2315] dark:text-amber-50">Caixa Rápido</h2>
            <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Recebimentos, receitas e despesas</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 font-mono">{new Date().toLocaleDateString('pt-BR')}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Search + Payment */}
        <div className="lg:col-span-3 space-y-5">
          {/* Search Orders */}
          <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-100 dark:border-[#2d1e0d] p-4 space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar pedido por cliente ou ID..."
                className="w-full pl-9 pr-3 py-2 border border-amber-200 dark:border-[#2d1e0d] rounded-xl text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100"
              />
            </div>

            {!selectedPedidoId && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {pedidosFiltrados.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhum pedido pendente</p>
                ) : (
                  pedidosFiltrados.map(p => {
                    const cli = store.clientes.find(c => c.id === p.cliente_id);
                    const recebido = store.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
                    const pendente = p.valor_total - recebido;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPedido(p.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-[#1c140c] border border-transparent hover:border-amber-100 dark:hover:border-[#2d1e0d] transition text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <User size={14} className="text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-amber-950 dark:text-amber-100 truncate">{cli?.nome || 'Cliente'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] text-gray-400 font-mono">#{p.id.slice(-6)}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                                p.status_id === 2 ? 'bg-amber-100 text-amber-800' :
                                p.status_id === 3 ? 'bg-indigo-100 text-indigo-800' :
                                p.status_id === 4 ? 'bg-emerald-100 text-emerald-800' :
                                p.status_id === 5 ? 'bg-gray-200 text-gray-600' : ''
                              }`}>
                                {store.statusNome(p.status_id)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono text-amber-950 dark:text-amber-100">{brl(p.valor_total)}</p>
                          <p className={`text-[9px] font-mono ${pendente <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {pendente <= 0 ? 'Pago' : `${brl(pendente)} pendente`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Payment Panel */}
          {selectedPedido && (
            <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-100 dark:border-[#2d1e0d] p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 text-sm">
                    <User size={14} /> {selectedCliente?.nome || 'Cliente'}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-mono">Pedido #{selectedPedido.id.slice(-6)}</p>
                </div>
                <button onClick={() => setSelectedPedidoId(null)} className="text-gray-400 hover:text-amber-950 p-1" aria-label="Fechar pedido selecionado">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-amber-50 dark:bg-[#1c140c] rounded-xl p-2">
                  <p className="text-[8px] text-gray-500 uppercase font-bold">Total</p>
                  <p className="font-bold font-mono text-xs text-amber-950 dark:text-amber-100">{brl(selectedPedido.valor_total)}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-[#0d2215] rounded-xl p-2">
                  <p className="text-[8px] text-gray-500 uppercase font-bold">Recebido</p>
                  <p className="font-bold font-mono text-xs text-emerald-700">{brl(totalRecebido)}</p>
                </div>
                <div className={`rounded-xl p-2 ${isPago ? 'bg-emerald-50 dark:bg-[#0d2215]' : 'bg-red-50 dark:bg-[#2d0d0d]'}`}>
                  <p className="text-[8px] text-gray-500 uppercase font-bold">Saldo</p>
                  <p className={`font-bold font-mono text-xs ${isPago ? 'text-emerald-700' : 'text-red-500'}`}>
                    {isPago ? '✓ Pago' : brl(saldoRestante)}
                  </p>
                </div>
              </div>

              {!isPago && (
                <>
                  {/* Payment Method Buttons */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-gray-500">Forma de Pagamento</label>
                    <div className="grid grid-cols-5 gap-1.5 mt-1">
                      {FORMAS_PAGAMENTO.map(f => (
                        <button
                          key={f.value}
                          onClick={() => { setFormaPagamento(f.value); if (f.value !== 'dinheiro' && troco > 0) setPaymentAmount(saldoRestante.toFixed(2)); }}
                          className={`flex flex-col items-center py-1.5 rounded-xl text-[9px] font-bold text-white transition shadow-sm ${
                            formaPagamento === f.value
                              ? f.color + ' ring-2 ring-offset-1 ring-amber-500 scale-105'
                              : 'bg-gray-200 dark:bg-[#2d1e0d] text-gray-600 dark:text-amber-200 hover:bg-gray-300 dark:hover:bg-[#3d2e1d]'
                          }`}
                        >
                          {f.icon}
                          <span>{f.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input + Troco inline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-gray-500">Valor a Receber</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={paymentAmount}
                          onChange={e => setPaymentAmount(e.target.value)}
                          placeholder={saldoRestante.toFixed(2).replace('.', ',')}
                          className="w-full pl-10 pr-3 py-2 border-2 border-amber-200 dark:border-[#2d1e0d] rounded-xl text-base font-bold font-mono bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 text-center"
                        />
                      </div>
                    </div>
                    {troco > 0 ? (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Troco a Devolver</label>
                        <div className="relative mt-1">
                          <div className="w-full h-11 flex items-center justify-between px-3 bg-blue-50 dark:bg-[#0d1b2d] border border-blue-200 dark:border-[#1d2d4d] rounded-xl">
                            <ArrowLeftRight size={14} className="text-blue-700 dark:text-blue-300 shrink-0" />
                            <span className="font-bold font-mono text-lg text-blue-700 dark:text-blue-300">{brl(troco)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-gray-500">Troco</label>
                        <div className="relative mt-1">
                          <div className="w-full h-11 flex items-center justify-center px-3 bg-gray-50 dark:bg-[#1c140c] border border-gray-200 dark:border-[#2d1e0d] rounded-xl">
                            <span className="font-mono text-sm text-gray-400">R$ 0,00</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {valorNumerico > saldoRestante && formaPagamento !== 'dinheiro' && (
                    <div className="p-1.5 bg-amber-50 dark:bg-[#2d1e0d] border border-amber-200 dark:border-[#3d2e1d] rounded-xl flex items-center gap-1 text-[9px] text-amber-800 dark:text-amber-300">
                      <AlertTriangle size={10} />
                      Valor maior que o saldo. Será registrado apenas {brl(saldoRestante)}.
                    </div>
                  )}

                  {/* Receber Button */}
                  {store.hasPermission('financeiro.lancar') && (
                  <button
                    onClick={handleReceberPagamento}
                    disabled={!paymentAmount || valorNumerico <= 0}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white disabled:text-gray-500 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    Receber {brl(valorRegistrar > 0 ? valorRegistrar : saldoRestante)}
                  </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Quick Actions + Extrato */}
        <div className="lg:col-span-2 space-y-5">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-100 dark:border-[#2d1e0d] p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-100">Ações Rápidas</h3>

            {/* Receita Livre */}
            {store.hasPermission('financeiro.lancar') && (
            <div className="bg-emerald-50/50 dark:bg-[#0d2215] border border-emerald-100 dark:border-[#1d3d25] rounded-xl p-3 space-y-2">
              <button
                onClick={() => { setShowReceitaLivre(!showReceitaLivre); setShowDespesaRapida(false); }}
                className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs"
              >
                <TrendingUp size={14} /> {showReceitaLivre ? 'Cancelar' : '➕ Receita Livre'}
              </button>
              {showReceitaLivre && (
                <div className="space-y-2 pt-1">
                  <input type="text" value={livreDescricao} onChange={e => setLivreDescricao(e.target.value)} placeholder="Descrição (ex: Venda avulsa)"
                    className="w-full p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
                  <div className="flex gap-2">
                    <input type="text" inputMode="decimal" value={livreValor} onChange={e => setLivreValor(e.target.value)} placeholder="Valor"
                      className="flex-1 p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono" />
                    <select value={livreForma} onChange={e => setLivreForma(e.target.value)}
                      className="flex-1 p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100">
                      {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <input type="date" value={livreData} onChange={e => setLivreData(e.target.value)}
                    className="w-full p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
                  <button onClick={handleNovaReceita}
                    disabled={!livreValor || !livreDescricao}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold transition">
                    Salvar Receita
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Despesa Rápida */}
            {store.hasPermission('financeiro.lancar') && (
            <div className="bg-red-50/50 dark:bg-[#2d0d0d] border border-red-100 dark:border-[#3d1d1d] rounded-xl p-3 space-y-2">
              <button
                onClick={() => { setShowDespesaRapida(!showDespesaRapida); setShowReceitaLivre(false); }}
                className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold text-xs"
              >
                <TrendingDown size={14} /> {showDespesaRapida ? 'Cancelar' : '➖ Despesa Rápida'}
              </button>
              {showDespesaRapida && (
                <div className="space-y-2 pt-1">
                  <input type="text" value={despDescricao} onChange={e => setDespDescricao(e.target.value)} placeholder="Descrição (ex: Café)"
                    className="w-full p-2 border border-red-200 dark:border-[#3d1d1d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
                  <div className="flex gap-2">
                    <input type="text" inputMode="decimal" value={despValor} onChange={e => setDespValor(e.target.value)} placeholder="Valor"
                      className="flex-1 p-2 border border-red-200 dark:border-[#3d1d1d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono" />
                    <select value={despForma} onChange={e => setDespForma(e.target.value)}
                      className="flex-1 p-2 border border-red-200 dark:border-[#3d1d1d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100">
                      {FORMAS_PAGAMENTO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                  <input type="date" value={despData} onChange={e => setDespData(e.target.value)}
                    className="w-full p-2 border border-red-200 dark:border-[#3d1d1d] rounded-lg text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
                  <button onClick={handleNovaDespesa}
                    disabled={!despValor || !despDescricao}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-300 text-white rounded-lg text-xs font-bold transition">
                    Salvar Despesa
                  </button>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Extrato do Dia */}
          <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-100 dark:border-[#2d1e0d] p-4 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
              <Clock size={14} /> Extrato do Dia
            </h3>

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {lancamentosHoje.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhuma movimentação hoje</p>
              ) : (
                lancamentosHoje.map(l => {
                  const cat = store.categoriasFinanceiro.find(c => c.id === l.categoria_id);
                  return (
                    <div key={l.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-amber-50 dark:hover:bg-[#1c140c]">
                      <div className="flex items-center gap-2 min-w-0">
                        {l.tipo === 'receita' ? (
                          <TrendingUp size={12} className="text-emerald-600 shrink-0" />
                        ) : (
                          <TrendingDown size={12} className="text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-amber-950 dark:text-amber-100 truncate leading-tight">
                            {l.descricao || cat?.nome || 'Sem descrição'}
                          </p>
                          <p className="text-[8px] text-gray-400 font-mono">
                            {new Date(l.criado_em || l.data_lancamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {l.pedido_id && ` • #${l.pedido_id.slice(-6)}`}
                            {l.forma_pagamento && ` • ${l.forma_pagamento}`}
                          </p>
                        </div>
                      </div>
                      <span className={`font-bold font-mono text-xs shrink-0 ${l.tipo === 'receita' ? 'text-emerald-700' : 'text-red-500'}`}>
                        {l.tipo === 'receita' ? '+' : '-'}{brl(l.valor)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-amber-100 dark:border-[#2d1e0d] pt-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700 font-bold flex items-center gap-1"><TrendingUp size={12} /> Receitas</span>
                <span className="font-bold font-mono text-emerald-700">{brl(receitasHoje)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-red-500 font-bold flex items-center gap-1"><TrendingDown size={12} /> Despesas</span>
                <span className="font-bold font-mono text-red-500">{brl(despesasHoje)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-amber-100 dark:border-[#2d1e0d] pt-1.5">
                <span className="font-bold text-amber-950 dark:text-amber-100">Saldo do Dia</span>
                <span className={`font-bold font-mono ${receitasHoje - despesasHoje >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                  {brl(receitasHoje - despesasHoje)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprovante Modal */}
      {comprovanteData && (
        <ComprovanteModal
          data={comprovanteData}
          appName={appName || 'Mini Fábrica'}
          onClose={() => setComprovanteData(null)}
        />
      )}
    </div>
  );
}
