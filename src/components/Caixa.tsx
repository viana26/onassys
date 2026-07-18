import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MiniFactoryStore } from '../lib/store';
import { Wallet, Search, DollarSign, TrendingUp, TrendingDown, Printer, X, CheckCircle2, AlertTriangle, Clock, User, CreditCard, Banknote, Smartphone, Landmark, ArrowLeftRight, ShoppingBag } from 'lucide-react';
import SelectSearch from './SelectSearch';

const dataLocal = (d?: Date) => {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
};

const getLancamentoLocalDate = (s: string) => {
  if (!s) return '';
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
  }
  return s.substring(0, 10);
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Formata string ISO/YYYY-MM-DD para DD/MM/AAAA HH:MM (sem timezone shift)
const fmtDataBR = (s: string) => {
  const [y, m, d] = s.substring(0, 10).split('-');
  let time = '';
  if (s.includes('T')) {
    const t = s.split('T')[1];
    time = ' ' + t.substring(0, 5);
  }
  return `${d}/${m}/${y}${time}`;
};

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
        <div class="row"><span class="label">Data:</span><span>${fmtDataBR(data.dataLancamento)}</span></div>
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
    onClose();
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
                {fmtDataBR(data.dataLancamento)}
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
  const [activeForm, setActiveForm] = useState<'receber' | 'receita' | 'despesa' | 'venda' | null>('receber');

  // Receita livre fields
  const [livreValor, setLivreValor] = useState('');
  const [livreDescricao, setLivreDescricao] = useState('');
  const [livreForma, setLivreForma] = useState('pix');

  // Despesa fields
  const [despValor, setDespValor] = useState('');
  const [despDescricao, setDespDescricao] = useState('');
  const [despForma, setDespForma] = useState('pix');

  // Venda Direta (controlled by activeForm)
  const [vdClienteId, setVdClienteId] = useState('');
  const [vdForma, setVdForma] = useState('pix');
  const [vdCategoriaId, setVdCategoriaId] = useState<number>(() => {
    const cat = store.categoriasFinanceiro.find(c => c.nome === 'Venda de Produtos');
    return cat?.id || 0;
  });
  const [vdCarrinho, setVdCarrinho] = useState<Array<{ produtoId: string; quantidade: number; precoUnitario: number }>>([]);
  const vdProdutosDisponiveis = useMemo(() => store.estoqueProdutos
    .filter(e => e.quantidade_disponivel > 0)
    .filter(e => !vdCarrinho.some(c => c.produtoId === e.produto_id))
    .map(e => {
      const prod = store.produtos.find(p => p.id === e.produto_id);
      return { ...e, produtoNome: prod?.nome || e.produto_id, precoVenda: prod?.preco_venda || 0 };
    })
    .sort((a, b) => a.produtoNome.localeCompare(b.produtoNome)), [store.estoqueProdutos, store.produtos, vdCarrinho]);
  const vdTotal = vdCarrinho.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
  const vdCategoriasReceita = store.categoriasFinanceiro.filter(c => c.tipo === 'receita');

  // Comprovante
  const [comprovanteData, setComprovanteData] = useState<ComprovanteData | null>(null);

  // Relógio
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const [dataCaixa, setDataCaixa] = useState(dataLocal());

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

  const lancamentosHoje = store.lancamentos.filter(l => getLancamentoLocalDate(l.data_lancamento) === dataCaixa);
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
    const now = new Date();
    const isToday = dataCaixa === dataLocal();
    const dataLancamento = isToday
      ? now.toISOString()
      : `${dataCaixa}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    await store.registrarPagamentoPedido(selectedPedidoId, validaValor, formaPagamento, dataLancamento);
    setComprovanteData({
      tipo: 'pagamento',
      pedidoId: selectedPedidoId,
      clienteNome: selectedCliente?.nome,
      descricao: `Pagamento pedido #${selectedPedidoId.slice(-6)} - ${selectedCliente?.nome || ''}`,
      valor: validaValor,
      valorRecebido: troco > 0 ? valorNumerico : undefined,
      troco: troco > 0 ? troco : undefined,
      formaPagamento,
      dataLancamento: dataLancamento,
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
    const now = new Date();
    const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dataLancamento = dataCaixa + timeStr;
    await store.addLancamentoFinanceiro({
      data_lancamento: dataLancamento,
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
      dataLancamento: dataLancamento,
    });
    setLivreValor('');
    setLivreDescricao('');
    setActiveForm(null);
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
    const now = new Date();
    const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dataLancamento = dataCaixa + timeStr;
    await store.addLancamentoFinanceiro({
      data_lancamento: dataLancamento,
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
      dataLancamento: dataLancamento,
    });
    setDespValor('');
    setDespDescricao('');
    setActiveForm(null);
    onUpdate();
  };

  const handleVendaDireta = async () => {
    if (!store.hasPermission('financeiro.lancar')) return;
    if (vdCarrinho.length === 0) return;
    if (!vdCategoriaId) return;

    const now = new Date();
    const timeStr = `T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dataLancamento = dataCaixa + timeStr;

    const result = await store.registrarVendaDireta({
      itens: vdCarrinho,
      clienteId: vdClienteId || undefined,
      formaPagamento: vdForma,
      categoriaId: vdCategoriaId,
      dataLancamento: dataLancamento,
    });

    if (!result.success) {
      alert(result.error || 'Erro ao registrar venda');
      return;
    }

    setComprovanteData({
      tipo: 'pagamento',
      descricao: `Venda balcão: ${vdCarrinho.map(i => {
        const prod = store.produtos.find(p => p.id === i.produtoId);
        return `${i.quantidade}x ${prod?.nome || i.produtoId}`;
      }).join(', ')}`,
      valor: vdTotal,
      formaPagamento: vdForma,
      dataLancamento: dataLancamento,
    });
    setActiveForm(null);
    setVdCarrinho([]);
    onUpdate();
  };

  return (
    <div className="h-full flex flex-col" data-help="caixa">
      <div className="flex-1 overflow-y-auto space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={22} className="text-amber-700" />
          <div>
            <h2 className="text-lg font-semibold text-[#2e2315] dark:text-amber-100">Caixa</h2>
            <p className="text-sm text-[#5c4a37]/60 dark:text-amber-100/50">Recebimentos, receitas e despesas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store.hasPermission('financeiro.lancar') && (
            <>
              <button
                onClick={() => setActiveForm('receber')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  activeForm === 'receber'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-md ring-2 ring-offset-1 ring-blue-300'
                    : 'border-blue-200 dark:border-[#1d3d4d] text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-[#0d1d2d]'
                }`}
              >
                <DollarSign size={14} /> Receber Pedidos
              </button>
              <button
                onClick={() => setActiveForm('receita')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  activeForm === 'receita'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-offset-1 ring-emerald-300'
                    : 'border-emerald-200 dark:border-[#1d3d25] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#0d2215]'
                }`}
              >
                <TrendingUp size={14} /> Receita Livre
              </button>
              <button
                onClick={() => setActiveForm('despesa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  activeForm === 'despesa'
                    ? 'bg-red-600 hover:bg-red-500 text-white border-red-600 shadow-md ring-2 ring-offset-1 ring-red-300'
                    : 'border-red-200 dark:border-[#3d1d1d] text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-[#2d0d0d]'
                }`}
              >
                <TrendingDown size={14} /> Despesa Rápida
              </button>
              <button
                onClick={() => { setActiveForm('venda'); setSelectedPedidoId(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  activeForm === 'venda'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-offset-1 ring-amber-300'
                    : 'border-amber-200 dark:border-[#3d2d1d] text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-[#22160b]'
                }`}
              >
                <ShoppingBag size={14} /> Venda Balcão
              </button>
            </>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Forms or Search + Payment */}
        <div className="lg:col-span-3 space-y-5">
          {/* Active Form: Receita Livre */}
          {activeForm === 'receita' && store.hasPermission('financeiro.lancar') && (
            <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-emerald-200 dark:border-[#1d3d25] p-4 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <TrendingUp size={14} /> Receita Livre
              </h3>
              <input type="text" value={livreDescricao} onChange={e => setLivreDescricao(e.target.value)} placeholder="Descrição (ex: Venda avulsa)"
                className="w-full p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-xl text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={livreValor} onChange={e => setLivreValor(e.target.value)} placeholder="Valor"
                  className="flex-1 p-2 border border-emerald-200 dark:border-[#1d3d25] rounded-xl text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono" />
                <SelectSearch value={livreForma} onChange={v => setLivreForma(v)} options={FORMAS_PAGAMENTO.map(f => ({ value: f.value, label: f.label }))} placeholder="Pagamento" />
              </div>
              <button onClick={() => { handleNovaReceita(); setActiveForm(null); }}
                disabled={!livreValor || !livreDescricao}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border transition bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                <TrendingUp size={14} /> Salvar Receita
              </button>
            </div>
          )}

          {/* Active Form: Despesa Rápida */}
          {activeForm === 'despesa' && store.hasPermission('financeiro.lancar') && (
            <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-red-200 dark:border-[#3d1d1d] p-4 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <TrendingDown size={14} /> Despesa Rápida
              </h3>
              <input type="text" value={despDescricao} onChange={e => setDespDescricao(e.target.value)} placeholder="Descrição (ex: Café)"
                className="w-full p-2 border border-red-200 dark:border-[#3d1d1d] rounded-xl text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100" />
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={despValor} onChange={e => setDespValor(e.target.value)} placeholder="Valor"
                  className="flex-1 p-2 border border-red-200 dark:border-[#3d1d1d] rounded-xl text-xs bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono" />
                <SelectSearch value={despForma} onChange={v => setDespForma(v)} options={FORMAS_PAGAMENTO.map(f => ({ value: f.value, label: f.label }))} placeholder="Pagamento" />
              </div>
              <button onClick={() => { handleNovaDespesa(); setActiveForm(null); }}
                disabled={!despValor || !despDescricao}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border transition bg-red-600 hover:bg-red-500 text-white border-red-600 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                <TrendingDown size={14} /> Salvar Despesa
              </button>
            </div>
          )}

          {/* Active Form: Venda de Balcão */}
          {activeForm === 'venda' && store.hasPermission('financeiro.lancar') && (
            <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-200 dark:border-[#3d2d1d] p-4 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <ShoppingBag size={14} /> Venda de Balcão
              </h3>

              {/* Cliente — vem primeiro */}
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500">Cliente (opcional)</label>
                <SelectSearch value={vdClienteId} onChange={v => setVdClienteId(v)} options={[{ value: '', label: 'Sem cliente' }, ...store.clientes.sort((a, b) => a.nome.localeCompare(b.nome)).map(c => ({ value: c.id, label: c.nome }))]} placeholder="Selecione um cliente" />
              </div>

              {/* Produtos Disponiveis */}
              <div>
                {/* Carrinho */}
                {vdCarrinho.length > 0 && (
                  <div className="mb-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-gray-500">Itens da Venda</label>
                    {vdCarrinho.map((item, idx) => {
                      const prod = store.produtos.find(p => p.id === item.produtoId);
                      const estoque = store.estoqueProdutos.find(e => e.produto_id === item.produtoId);
                      return (
                        <div key={item.produtoId} className="flex items-center gap-1 bg-white dark:bg-[#1c140c] rounded-lg p-2 border border-amber-100 dark:border-[#2d1e0d]">
                          <span className="flex-1 text-[10px] font-medium truncate">{prod?.nome || item.produtoId}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => {
                              setVdCarrinho(prev => prev.map((c, i) => i === idx ? { ...c, quantidade: Math.max(1, c.quantidade - 1) } : c));
                            }} className="text-[10px] w-5 h-5 rounded bg-gray-100 dark:bg-[#2d1e0d] font-bold cursor-pointer">−</button>
                            <span className="text-[10px] font-mono font-bold w-6 text-center">{item.quantidade}</span>
                            <button onClick={() => {
                              const estoqueQtd = estoque?.quantidade_disponivel || 0;
                              setVdCarrinho(prev => prev.map((c, i) => i === idx ? { ...c, quantidade: Math.min(estoqueQtd, c.quantidade + 1) } : c));
                            }} className="text-[10px] w-5 h-5 rounded bg-gray-100 dark:bg-[#2d1e0d] font-bold cursor-pointer">+</button>
                          </div>
                          <span className="text-[10px] font-mono font-bold w-16 text-right">{brl(item.quantidade * item.precoUnitario)}</span>
                          <button onClick={() => setVdCarrinho(prev => prev.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 cursor-pointer ml-1">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Seletor de Produto */}
                <SelectSearch value="" onChange={v => {
                  if (!v) return;
                  setVdCarrinho(prev => {
                    if (prev.some(c => c.produtoId === v)) return prev;
                    const prod = store.produtos.find(p => p.id === v);
                    const estoque = store.estoqueProdutos.find(ep => ep.produto_id === v);
                    if (!prod || !estoque) return prev;
                    return [...prev, { produtoId: v, quantidade: 1, precoUnitario: prod.preco_venda || 0 }];
                  });
                }} options={vdProdutosDisponiveis.map(e => ({ value: e.produto_id, label: `${e.produtoNome} (estoque: ${e.quantidade_disponivel})` }))} placeholder={`Selecione um produto (${vdProdutosDisponiveis.length} disponíveis)...`} />
              </div>

              {/* Forma de pagamento + Categoria */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Pagamento</label>
                  <SelectSearch value={vdForma} onChange={v => setVdForma(v)} options={FORMAS_PAGAMENTO.map(f => ({ value: f.value, label: f.label }))} placeholder="Pagamento" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500">Categoria</label>
                  <SelectSearch value={String(vdCategoriaId)} onChange={v => setVdCategoriaId(Number(v))} options={vdCategoriasReceita.map(c => ({ value: String(c.id), label: c.nome }))} placeholder="Categoria" />
                </div>
              </div>

              {/* Total + Confirmar */}
              <div className="flex items-center justify-between pt-2 border-t border-amber-100 dark:border-[#2d1e0d]">
                <span className="text-xs font-bold">Total: <span className="font-mono text-base">{brl(vdTotal)}</span></span>
                <button onClick={() => { handleVendaDireta(); setActiveForm(null); }}
                  disabled={vdCarrinho.length === 0}
                  className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border transition bg-amber-600 hover:bg-amber-500 text-white border-amber-600 shadow-md disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
                  <ShoppingBag size={14} /> Confirmar Venda
                </button>
              </div>
            </div>
          )}

          {/* Search Orders + Payment Panel */}
          {activeForm === 'receber' && (
            <>
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
                  <div className="max-h-[300px] overflow-y-auto space-y-1">
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
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Extrato do Dia */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#120c06] rounded-2xl border border-amber-100 dark:border-[#2d1e0d] p-4 space-y-3 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                <Clock size={14} /> Extrato do Dia
              </h3>
              <input
                type="date"
                value={dataCaixa}
                onChange={e => setDataCaixa(e.target.value || dataLocal())}
                className="text-xs p-1 px-2 border border-amber-200 dark:border-[#2d1e0d] rounded-lg bg-white dark:bg-[#1c140c] text-amber-950 dark:text-amber-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex-1 space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
              {lancamentosHoje.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhuma movimentação nesta data</p>
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
          onClose={() => { setComprovanteData(null); onUpdate(); }}
        />
      )}

      </div>{/* fim flex-1 */}
    </div>
  );
}
