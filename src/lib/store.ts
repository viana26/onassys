import { Material, Produto, FichaTecnicaItem, EstoqueProduto, Cliente, Pedido, ItemPedido, MovimentacaoMaterial, MovimentacaoProduto, PedidoStatus } from '../types';
import { 
  INITIAL_MATERIAIS, 
  INITIAL_PRODUTOS, 
  INITIAL_FICHAS_TECNICAS, 
  INITIAL_ESTOQUE_PRODUTOS, 
  INITIAL_CLIENTES, 
  INITIAL_PEDIDOS, 
  INITIAL_ITENS_PEDIDO, 
  INITIAL_MOVIMENTACOES_MATERIAIS, 
  INITIAL_MOVIMENTACOES_PRODUTOS 
} from './seedData';
import { calcularCustoProducao, normalizarQuantidade, analisarEstoqueParaPedido } from './calculos';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export class MiniFactoryStore {
  materiais: Material[] = [];
  produtos: Produto[] = [];
  fichas: FichaTecnicaItem[] = [];
  estoqueProdutos: EstoqueProduto[] = [];
  clientes: Cliente[] = [];
  pedidos: Pedido[] = [];
  itensPedido: ItemPedido[] = [];
  movMateriais: MovimentacaoMaterial[] = [];
  movProdutos: MovimentacaoProduto[] = [];
  private onUpdateCallbacks: (() => void)[] = [];
  private isLoaded = false;

  constructor() {
    this.loadFromSupabase();
  }

  subscribe(callback: () => void) {
    this.onUpdateCallbacks.push(callback);
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.onUpdateCallbacks.forEach(cb => cb());
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem('sb_materiais', JSON.stringify(this.materiais));
      localStorage.setItem('sb_produtos', JSON.stringify(this.produtos));
      localStorage.setItem('sb_fichas_tecnicas', JSON.stringify(this.fichas));
      localStorage.setItem('sb_estoque_produtos', JSON.stringify(this.estoqueProdutos));
      localStorage.setItem('sb_clientes', JSON.stringify(this.clientes));
      localStorage.setItem('sb_pedidos', JSON.stringify(this.pedidos));
      localStorage.setItem('sb_itens_pedido', JSON.stringify(this.itensPedido));
      localStorage.setItem('sb_movimentacoes_materiais', JSON.stringify(this.movMateriais));
      localStorage.setItem('sb_movimentacoes_produtos', JSON.stringify(this.movProdutos));
    } catch (e) {
      console.error('Erro ao salvar localStorage:', e);
    }
  }

  async loadFromSupabase() {
    if (!isSupabaseConfigured()) {
      this.loadFromLocalStorage();
      return;
    }

    try {
      const [
        materiaisRes,
        produtosRes,
        fichasRes,
        estoqueProdutosRes,
        clientesRes,
        pedidosRes,
        itensPedidoRes,
        movMateriaisRes,
        movProdutosRes
      ] = await Promise.all([
        supabase.from('materiais').select('*'),
        supabase.from('produtos').select('*'),
        supabase.from('fichas_tecnicas').select('*'),
        supabase.from('estoque_produtos').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('pedidos').select('*'),
        supabase.from('itens_pedido').select('*'),
        supabase.from('movimentacoes_materiais').select('*').order('criado_em', { ascending: false }),
        supabase.from('movimentacoes_produtos').select('*').order('criado_em', { ascending: false })
      ]);

      this.materiais = materiaisRes.data || [];
      this.produtos = produtosRes.data || [];
      this.fichas = fichasRes.data || [];
      this.estoqueProdutos = estoqueProdutosRes.data || [];
      this.clientes = clientesRes.data || [];
      this.pedidos = pedidosRes.data || [];
      this.itensPedido = itensPedidoRes.data || [];
      this.movMateriais = movMateriaisRes.data || [];
      this.movProdutos = movProdutosRes.data || [];

      this.isLoaded = true;
      await this.recalcularCustosProdutos();
      this.notify();
    } catch (e) {
      console.error('Erro ao carregar do Supabase, usando localStorage:', e);
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage() {
    try {
      const materiastData = localStorage.getItem('sb_materiais');
      const produtosData = localStorage.getItem('sb_produtos');
      const fichasData = localStorage.getItem('sb_fichas_tecnicas');
      const estoqueData = localStorage.getItem('sb_estoque_produtos');
      const clientesData = localStorage.getItem('sb_clientes');
      const pedidosData = localStorage.getItem('sb_pedidos');
      const itensData = localStorage.getItem('sb_itens_pedido');
      const movMatData = localStorage.getItem('sb_movimentacoes_materiais');
      const movProdData = localStorage.getItem('sb_movimentacoes_produtos');

      this.materiais = materiastData ? JSON.parse(materiastData) : INITIAL_MATERIAIS;
      this.produtos = produtosData ? JSON.parse(produtosData) : INITIAL_PRODUTOS;
      this.fichas = fichasData ? JSON.parse(fichasData) : INITIAL_FICHAS_TECNICAS;
      this.estoqueProdutos = estoqueData ? JSON.parse(estoqueData) : INITIAL_ESTOQUE_PRODUTOS;
      this.clientes = clientesData ? JSON.parse(clientesData) : INITIAL_CLIENTES;
      this.pedidos = pedidosData ? JSON.parse(pedidosData) : INITIAL_PEDIDOS;
      this.itensPedido = itensData ? JSON.parse(itensData) : INITIAL_ITENS_PEDIDO;
      this.movMateriais = movMatData ? JSON.parse(movMatData) : INITIAL_MOVIMENTACOES_MATERIAIS;
      this.movProdutos = movProdData ? JSON.parse(movProdData) : INITIAL_MOVIMENTACOES_PRODUTOS;

      this.isLoaded = true;
      this.recalcularCustosProdutos();
      this.notify();
    } catch (e) {
      console.error('Erro ao carregar localStorage:', e);
      this.materiais = INITIAL_MATERIAIS;
      this.produtos = INITIAL_PRODUTOS;
      this.fichas = INITIAL_FICHAS_TECNICAS;
      this.estoqueProdutos = INITIAL_ESTOQUE_PRODUTOS;
      this.clientes = INITIAL_CLIENTES;
      this.pedidos = INITIAL_PEDIDOS;
      this.itensPedido = INITIAL_ITENS_PEDIDO;
      this.movMateriais = INITIAL_MOVIMENTACOES_MATERIAIS;
      this.movProdutos = INITIAL_MOVIMENTACOES_PRODUTOS;
      this.isLoaded = true;
      this.notify();
    }
  }

  async recalcularCustosProdutos() {
    let mudou = false;
    const produtosParaAtualizar: Produto[] = [];
    
    this.produtos = this.produtos.map(p => {
      const custoNovo = calcularCustoProducao(p.id, this.fichas, this.materiais);
      if (p.custo_producao_calculado !== custoNovo) {
        mudou = true;
        const updated = { ...p, custo_producao_calculado: custoNovo };
        produtosParaAtualizar.push(updated);
        return updated;
      }
      return p;
    });

    if (mudou && isSupabaseConfigured() && produtosParaAtualizar.length > 0) {
      try {
        await supabase.from('produtos').upsert(produtosParaAtualizar);
      } catch (e) {
        console.error('Erro ao recalcular custos:', e);
      }
    }
  }

  // ==========================================
  // MÓDULO 1: CRUD MATÉRIAS-PRIMAS
  // ==========================================

  async addMaterial(material: Omit<Material, 'id' | 'data_ultima_atualizacao'>) {
    const novo: Material = {
      ...material,
      id: 'mat_' + Math.random().toString(36).substring(2, 9),
      data_ultima_atualizacao: new Date().toISOString()
    };
    this.materiais.push(novo);
    this.notify();
    this.saveToLocalStorage();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('materiais').insert(novo);
      } catch (e) {
        console.error('Erro ao salvar no Supabase (offline?):', e);
      }
    }
    return novo;
  }

  async updateMaterial(id: string, updates: Partial<Omit<Material, 'id'>>) {
    let updatedMaterial: Material | null = null;
    this.materiais = this.materiais.map(m => {
      if (m.id === id) {
        updatedMaterial = { ...m, ...updates, data_ultima_atualizacao: new Date().toISOString() };
        return updatedMaterial;
      }
      return m;
    });
    
    this.notify();

    if (isSupabaseConfigured() && updatedMaterial) {
      await supabase.from('materiais').update(updatedMaterial).eq('id', id);
    }
  }

  async deleteMaterial(id: string) {
    this.materiais = this.materiais.filter(m => m.id !== id);
    this.fichas = this.fichas.filter(f => f.material_id !== id);
    this.recalcularCustosProdutos();
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('materiais').delete().eq('id', id);
    }
  }

  async lancarEntradaMaterial(id: string, quantidade: number, custoUnitario?: number, observacao?: string) {
    const mat = this.materiais.find(m => m.id === id);
    if (!mat) return;
    mat.quantidade_atual += quantidade;
    if (custoUnitario !== undefined && custoUnitario >= 0) {
      mat.custo_unitario = custoUnitario;
    }
    mat.data_ultima_atualizacao = new Date().toISOString();

    const unitPrice = custoUnitario !== undefined ? custoUnitario : mat.custo_unitario;
    const valorPago = unitPrice * quantidade;

    const mov: MovimentacaoMaterial = {
      id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
      material_id: id,
      tipo: 'entrada_compra',
      quantidade,
      observacao,
      valor_pago: valorPago,
      custo_unitario: unitPrice,
      criado_em: new Date().toISOString()
    };
    this.movMateriais.unshift(mov);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('materiais').update({
        quantidade_atual: mat.quantidade_atual,
        custo_unitario: mat.custo_unitario,
        data_ultima_atualizacao: mat.data_ultima_atualizacao
      }).eq('id', id);
      await supabase.from('movimentacoes_materiais').insert(mov);
    }
  }

  // ==========================================
  // MÓDULO 2: CRUD PRODUTOS
  // ==========================================

  async addProduto(produto: Partial<Omit<Produto, 'id'>>, _recipeItems?: FichaTecnicaItem[]) {
    const novo: Produto = {
      nome: produto.nome || '',
      categoria: produto.categoria || 'outro',
      descricao: produto.descricao,
      unidade_producao: produto.unidade_producao || 'un',
      tempo_producao_minutos: produto.tempo_producao_minutos ?? 0,
      custo_producao_calculado: produto.custo_producao_calculado ?? 0,
      ativo: produto.ativo ?? true,
      margem_lucro: produto.margem_lucro ?? 0,
      preco_venda: produto.preco_venda ?? 0,
      imagem: produto.imagem,
      id: 'prod_' + Math.random().toString(36).substring(2, 9)
    };
    this.produtos.push(novo);
    this.notify();
    this.saveToLocalStorage();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('produtos').insert(novo);
      } catch (e) {
        console.error('Erro ao salvar no Supabase (offline?):', e);
      }
    }
    return novo;
  }

  async updateProduto(id: string, updates: Partial<Omit<Produto, 'id'>>, _recipeItems?: FichaTecnicaItem[]) {
    this.produtos = this.produtos.map(p => p.id === id ? { ...p, ...updates } : p);
    this.recalcularCustosProdutos();
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('produtos').update(updates).eq('id', id);
    }
  }

  async deleteProduto(id: string) {
    this.produtos = this.produtos.filter(p => p.id !== id);
    this.fichas = this.fichas.filter(f => f.produto_id !== id);
    this.estoqueProdutos = this.estoqueProdutos.filter(e => e.produto_id !== id);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('produtos').delete().eq('id', id);
    }
  }

  // ==========================================
  // MÓDULO 3: FICHAS TÉCNICAS
  // ==========================================

  async addFichaTecnica(ficha: Omit<FichaTecnicaItem, 'id'>) {
    const nova: FichaTecnicaItem = {
      ...ficha,
      id: 'ficha_' + Math.random().toString(36).substring(2, 9)
    };
    this.fichas.push(nova);
    this.recalcularCustosProdutos();
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('fichas_tecnicas').insert(nova);
    }
    return nova;
  }

  async updateFichaTecnica(id: string, updates: Partial<Omit<FichaTecnicaItem, 'id'>>) {
    this.fichas = this.fichas.map(f => f.id === id ? { ...f, ...updates } : f);
    this.recalcularCustosProdutos();
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('fichas_tecnicas').update(updates).eq('id', id);
    }
  }

  async deleteFichaTecnica(id: string) {
    this.fichas = this.fichas.filter(f => f.id !== id);
    this.recalcularCustosProdutos();
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('fichas_tecnicas').delete().eq('id', id);
    }
  }

  // ==========================================
  // MÓDULO 4: ESTOQUE PRODUTOS
  // ==========================================

  async addEstoqueProduto(estoque: Omit<EstoqueProduto, 'id' | 'data_atualizacao'>) {
    const novo: EstoqueProduto = {
      ...estoque,
      id: 'est_' + Math.random().toString(36).substring(2, 9),
      data_atualizacao: new Date().toISOString()
    };
    this.estoqueProdutos.push(novo);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('estoque_produtos').insert(novo);
    }
    return novo;
  }

  async updateEstoqueProduto(id: string, updates: Partial<Omit<EstoqueProduto, 'id'>>) {
    let updated: EstoqueProduto | null = null;
    this.estoqueProdutos = this.estoqueProdutos.map(e => {
      if (e.id === id) {
        updated = { ...e, ...updates, data_atualizacao: new Date().toISOString() };
        return updated;
      }
      return e;
    });
    this.notify();

    if (isSupabaseConfigured() && updated) {
      await supabase.from('estoque_produtos').update(updated).eq('id', id);
    }
  }

  async updateEstoqueProdutoConfig(id: string, updates: Partial<Omit<EstoqueProduto, 'id'>>) {
    return this.updateEstoqueProduto(id, updates);
  }

  async deleteEstoqueProduto(id: string) {
    this.estoqueProdutos = this.estoqueProdutos.filter(e => e.id !== id);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('estoque_produtos').delete().eq('id', id);
    }
  }

  async lancarLoteProducao(produtoId: string, quantidade: number, dataValidade?: string, lote?: string, observacao?: string) {
    let estoque = this.estoqueProdutos.find(e => e.produto_id === produtoId);
    
    if (estoque) {
      estoque.quantidade_disponivel += quantidade;
      estoque.data_atualizacao = new Date().toISOString();
      if (dataValidade) estoque.data_validade = dataValidade;
      if (lote) estoque.lote = lote;

      await supabase.from('estoque_produtos').update({
        quantidade_disponivel: estoque.quantidade_disponivel,
        data_validade: estoque.data_validade,
        lote: estoque.lote,
        data_atualizacao: estoque.data_atualizacao
      }).eq('id', estoque.id);
    } else {
      estoque = {
        id: 'est_' + Math.random().toString(36).substring(2, 9),
        produto_id: produtoId,
        quantidade_disponivel: quantidade,
        quantidade_reservada: 0,
        quantidade_minima: 0,
        data_validade: dataValidade,
        lote,
        data_atualizacao: new Date().toISOString()
      };
      this.estoqueProdutos.push(estoque);

      await supabase.from('estoque_produtos').insert(estoque);
    }

    const mov: MovimentacaoProduto = {
      id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
      produto_id: produtoId,
      tipo: 'entrada_producao',
      quantidade,
      observacao: observacao || (lote ? `Lote: ${lote}` : undefined),
      criado_em: new Date().toISOString()
    };
    this.movProdutos.unshift(mov);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('movimentacoes_produtos').insert(mov);
    }
  }

  // ==========================================
  // MÓDULO 5: CLIENTES
  // ==========================================

  async addCliente(cliente: Omit<Cliente, 'id'>) {
    const novo: Cliente = {
      ...cliente,
      id: 'cli_' + Math.random().toString(36).substring(2, 9)
    };
    this.clientes.push(novo);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('clientes').insert(novo);
    }
    return novo;
  }

  async updateCliente(id: string, updates: Partial<Omit<Cliente, 'id'>>) {
    this.clientes = this.clientes.map(c => c.id === id ? { ...c, ...updates } : c);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('clientes').update(updates).eq('id', id);
    }
  }

  async deleteCliente(id: string) {
    this.clientes = this.clientes.filter(c => c.id !== id);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('clientes').delete().eq('id', id);
    }
  }

  // ==========================================
  // MÓDULO 6: PEDIDOS
  // ==========================================

  async addPedido(pedido: Partial<Omit<Pedido, 'id' | 'data_pedido' | 'atualizado_em'>>, _itens?: ItemPedido[]) {
    const novo: Pedido = {
      cliente_id: pedido.cliente_id || '',
      status: pedido.status || 'rascunho',
      data_entrega_prevista: pedido.data_entrega_prevista || new Date().toISOString(),
      observacoes: pedido.observacoes,
      criado_by: pedido.criado_by,
      valor_total: pedido.valor_total ?? 0,
      id: 'ped_' + Math.random().toString(36).substring(2, 9),
      data_pedido: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };
    this.pedidos.push(novo);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('pedidos').insert(novo);
    }
    return novo;
  }

  async updatePedido(id: string, updates: Partial<Omit<Pedido, 'id'>>) {
    this.pedidos = this.pedidos.map(p => p.id === id ? { ...p, ...updates, atualizado_em: new Date().toISOString() } : p);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('pedidos').update({ ...updates, atualizado_em: new Date().toISOString() }).eq('id', id);
    }
  }

  async updatePedidoStatus(id: string, status: PedidoStatus): Promise<{ success: boolean; error?: string }> {
    try {
      await this.updatePedido(id, { status });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar status' };
    }
  }

  async deletePedido(id: string) {
    this.pedidos = this.pedidos.filter(p => p.id !== id);
    this.itensPedido = this.itensPedido.filter(i => i.pedido_id !== id);
    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('pedidos').delete().eq('id', id);
    }
  }

  async addItemPedido(item: Omit<ItemPedido, 'id'>) {
    const novo: ItemPedido = {
      ...item,
      id: 'item_' + Math.random().toString(36).substring(2, 9)
    };
    this.itensPedido.push(novo);
    
    const pedido = this.pedidos.find(p => p.id === item.pedido_id);
    if (pedido) {
      pedido.valor_total = this.itensPedido
        .filter(i => i.pedido_id === pedido.id)
        .reduce((sum, i) => sum + (i.quantidade_solicitada * i.preco_unitario), 0);
      pedido.atualizado_em = new Date().toISOString();
    }

    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('itens_pedido').insert(novo);
      if (pedido) {
        await supabase.from('pedidos').update({ valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em }).eq('id', pedido.id);
      }
    }
    return novo;
  }

  async updateItemPedido(id: string, updates: Partial<Omit<ItemPedido, 'id'>>) {
    this.itensPedido = this.itensPedido.map(i => i.id === id ? { ...i, ...updates } : i);
    
    const item = this.itensPedido.find(i => i.id === id);
    if (item) {
      const pedido = this.pedidos.find(p => p.id === item.pedido_id);
      if (pedido) {
        pedido.valor_total = this.itensPedido
          .filter(i => i.pedido_id === pedido.id)
          .reduce((sum, i) => sum + (i.quantidade_solicitada * i.preco_unitario), 0);
        pedido.atualizado_em = new Date().toISOString();
      }
    }

    this.notify();

    if (isSupabaseConfigured() && item) {
      await supabase.from('itens_pedido').update(updates).eq('id', id);
      const pedido = this.pedidos.find(p => p.id === item.pedido_id);
      if (pedido) {
        await supabase.from('pedidos').update({ valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em }).eq('id', pedido.id);
      }
    }
  }

  async deleteItemPedido(id: string) {
    const item = this.itensPedido.find(i => i.id === id);
    this.itensPedido = this.itensPedido.filter(i => i.id !== id);
    
    if (item) {
      const pedido = this.pedidos.find(p => p.id === item.pedido_id);
      if (pedido) {
        pedido.valor_total = this.itensPedido
          .filter(i => i.pedido_id === pedido.id)
          .reduce((sum, i) => sum + (i.quantidade_solicitada * i.preco_unitario), 0);
        pedido.atualizado_em = new Date().toISOString();
      }
    }

    this.notify();

    if (isSupabaseConfigured()) {
      await supabase.from('itens_pedido').delete().eq('id', id);
      if (item) {
        const pedido = this.pedidos.find(p => p.id === item.pedido_id);
        if (pedido) {
          await supabase.from('pedidos').update({ valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em }).eq('id', pedido.id);
        }
      }
    }
  }

  async lancarSaidaPedido(pedidoId: string) {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    const itens = this.itensPedido.filter(i => i.pedido_id === pedidoId);

    for (const item of itens) {
      let estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (estoque) {
        estoque.quantidade_disponivel -= item.quantidade_solicitada;
        estoque.data_atualizacao = new Date().toISOString();

        await supabase.from('estoque_produtos').update({
          quantidade_disponivel: estoque.quantidade_disponivel,
          data_atualizacao: estoque.data_atualizacao
        }).eq('id', estoque.id);
      }

      const mov: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id,
        tipo: 'saida_pedido',
        quantidade: item.quantidade_solicitada,
        pedido_id: pedidoId,
        criado_em: new Date().toISOString()
      };
      this.movProdutos.unshift(mov);

      await supabase.from('movimentacoes_produtos').insert(mov);
    }

    this.notify();
  }
}