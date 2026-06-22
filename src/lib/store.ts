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

// Keys for LocalStorage
const KEYS = {
  MATERIAIS: 'sb_materiais',
  PRODUTOS: 'sb_produtos',
  FICHAS_TECNICAS: 'sb_fichas_tecnicas',
  ESTOQUE_PRODUTOS: 'sb_estoque_produtos',
  CLIENTES: 'sb_clientes',
  PEDIDOS: 'sb_pedidos',
  ITENS_PEDIDO: 'sb_itens_pedido',
  MOVIMENTACOES_MATERIAIS: 'sb_movimentacoes_materiais',
  MOVIMENTACOES_PRODUTOS: 'sb_movimentacoes_produtos'
};

// Initial loaded state helper
function getStored<T>(key: string, backup: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : backup;
  } catch (e) {
    console.error('Failed to load localStorage key', key, e);
    return backup;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save localStorage key', key, e);
  }
}

export class MiniFactoryStore {
  materiais: Material[];
  produtos: Produto[];
  fichas: FichaTecnicaItem[];
  estoqueProdutos: EstoqueProduto[];
  clientes: Cliente[];
  pedidos: Pedido[];
  itensPedido: ItemPedido[];
  movMateriais: MovimentacaoMaterial[];
  movProdutos: MovimentacaoProduto[];
  private onUpdateCallbacks: (() => void)[] = [];

  constructor() {
    this.materiais = getStored(KEYS.MATERIAIS, INITIAL_MATERIAIS);
    this.produtos = getStored(KEYS.PRODUTOS, INITIAL_PRODUTOS);
    this.fichas = getStored(KEYS.FICHAS_TECNICAS, INITIAL_FICHAS_TECNICAS);
    this.estoqueProdutos = getStored(KEYS.ESTOQUE_PRODUTOS, INITIAL_ESTOQUE_PRODUTOS);
    this.clientes = getStored(KEYS.CLIENTES, INITIAL_CLIENTES);
    this.pedidos = getStored(KEYS.PEDIDOS, INITIAL_PEDIDOS);
    this.itensPedido = getStored(KEYS.ITENS_PEDIDO, INITIAL_ITENS_PEDIDO);
    this.movMateriais = getStored(KEYS.MOVIMENTACOES_MATERIAIS, INITIAL_MOVIMENTACOES_MATERIAIS);
    this.movProdutos = getStored(KEYS.MOVIMENTACOES_PRODUTOS, INITIAL_MOVIMENTACOES_PRODUTOS);

    // Initial recalculation of production costs
    this.recalcularCustosProdutos();
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

  private saveAll() {
    setStored(KEYS.MATERIAIS, this.materiais);
    setStored(KEYS.PRODUTOS, this.produtos);
    setStored(KEYS.FICHAS_TECNICAS, this.fichas);
    setStored(KEYS.ESTOQUE_PRODUTOS, this.estoqueProdutos);
    setStored(KEYS.CLIENTES, this.clientes);
    setStored(KEYS.PEDIDOS, this.pedidos);
    setStored(KEYS.ITENS_PEDIDO, this.itensPedido);
    setStored(KEYS.MOVIMENTACOES_MATERIAIS, this.movMateriais);
    setStored(KEYS.MOVIMENTACOES_PRODUTOS, this.movProdutos);
    this.notify();
  }

  /**
   * Automatically loops through all active products and calculates their current raw ingredients cost
   */
  recalcularCustosProdutos() {
    let mudou = false;
    this.produtos = this.produtos.map(p => {
      const custoNovo = calcularCustoProducao(p.id, this.fichas, this.materiais);
      if (p.custo_producao_calculado !== custoNovo) {
        mudou = true;
        return { ...p, custo_producao_calculado: custoNovo };
      }
      return p;
    });
    if (mudou) {
      setStored(KEYS.PRODUTOS, this.produtos);
    }
  }

  // ==========================================
  // MÓDULO 1: CRUD MATÉRIAS-PRIMAS
  // ==========================================

  addMaterial(material: Omit<Material, 'id' | 'data_ultima_atualizacao'>) {
    const novo: Material = {
      ...material,
      id: 'mat_' + Math.random().toString(36).substring(2, 9),
      data_ultima_atualizacao: new Date().toISOString()
    };
    this.materiais.push(novo);
    this.saveAll();
    return novo;
  }

  updateMaterial(id: string, updates: Partial<Omit<Material, 'id'>>) {
    this.materiais = this.materiais.map(m => {
      if (m.id === id) {
        return { 
          ...m, 
          ...updates, 
          data_ultima_atualizacao: new Date().toISOString() 
        };
      }
      return m;
    });
    this.recalcularCustosProdutos();
    this.saveAll();
  }

  deleteMaterial(id: string) {
    this.materiais = this.materiais.filter(m => m.id !== id);
    // Delete links in fichas técnicas too
    this.fichas = this.fichas.filter(f => f.material_id !== id);
    this.recalcularCustosProdutos();
    this.saveAll();
  }

  lancarEntradaMaterial(id: string, quantidade: number, custoUnitario?: number, observacao?: string) {
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
      observacao: observacao || 'Entrada manual de estoque/compra',
      custo_unitario: unitPrice,
      valor_pago: valorPago,
      criado_em: new Date().toISOString()
    };
    this.movMateriais.unshift(mov);
    this.recalcularCustosProdutos();
    this.saveAll();
  }

  // ==========================================
  // MÓDULO 2 & 3: PRODUTOS, FICHAS TÉCNICAS & ESTOQUE DE PRODUTOS
  // ==========================================

  addProduto(produto: Omit<Produto, 'id' | 'custo_producao_calculado'>, ingredientes: Omit<FichaTecnicaItem, 'id' | 'produto_id'>[]) {
    const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
    
    // Create product
    const novoProd: Produto = {
      ...produto,
      id: prodId,
      custo_producao_calculado: 0
    };
    this.produtos.push(novoProd);

    // Create recipe items
    ingredientes.forEach(ing => {
      this.fichas.push({
        id: 'ft_' + Math.random().toString(36).substring(2, 9),
        produto_id: prodId,
        material_id: ing.material_id,
        quantidade_necessaria: ing.quantidade_necessaria,
        unidade: ing.unidade
      });
    });

    // Create default finished stock row
    this.estoqueProdutos.push({
      id: 'ep_' + Math.random().toString(36).substring(2, 9),
      produto_id: prodId,
      quantidade_disponivel: 0,
      quantidade_reservada: 0,
      quantidade_minima: 5, // default
      data_atualizacao: new Date().toISOString()
    });

    this.saveAll();
    this.recalcularCustosProdutos();
    this.saveAll();
    return prodId;
  }

  updateProduto(id: string, updates: Partial<Produto>, novosIngredientes?: Omit<FichaTecnicaItem, 'id' | 'produto_id'>[]) {
    this.produtos = this.produtos.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });

    if (novosIngredientes !== undefined) {
      // Clean previous recipe
      this.fichas = this.fichas.filter(f => f.produto_id !== id);
      // Insert new recipe
      novosIngredientes.forEach(ing => {
        this.fichas.push({
          id: 'ft_' + Math.random().toString(36).substring(2, 9),
          produto_id: id,
          material_id: ing.material_id,
          quantidade_necessaria: ing.quantidade_necessaria,
          unidade: ing.unidade
        });
      });
    }

    this.recalcularCustosProdutos();
    this.saveAll();
  }

  deleteProduto(id: string) {
    this.produtos = this.produtos.filter(p => p.id !== id);
    this.fichas = this.fichas.filter(f => f.produto_id !== id);
    this.estoqueProdutos = this.estoqueProdutos.filter(e => e.produto_id !== id);
    this.itensPedido = this.itensPedido.filter(i => i.produto_id !== id);
    this.saveAll();
  }

  // Update finished goods minimum stock thresholds, lot, split etc
  updateEstoqueProdutoConfig(produtoId: string, updates: { quantidade_minima?: number; lote?: string; data_validade?: string }) {
    this.estoqueProdutos = this.estoqueProdutos.map(ep => {
      if (ep.produto_id === produtoId) {
        return {
          ...ep,
          ...updates,
          data_atualizacao: new Date().toISOString()
        };
      }
      return ep;
    });
    this.saveAll();
  }

  /**
   * Rule 3: Lote de produção.
   * Conclui produção de X unidades:
   * 1. Verifica e Desconta matérias-primas do estoque
   * 2. Adiciona o produto ao estoque de produtos acabados
   */
  lancarLoteProducao(produtoId: string, quantidade: number, lote?: string, validade?: string, observacao?: string) {
    // Check if ingredient stock allows this
    const ingredientes = this.fichas.filter(f => f.produto_id === produtoId);
    
    // First verify
    for (const ing of ingredientes) {
      const mat = this.materiais.find(m => m.id === ing.material_id);
      if (!mat) continue;
      const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
      const totalNecessario = qtdNormalizada * quantidade;
      if (mat.quantidade_atual < totalNecessario) {
        throw new Error(`Estoque insuficiente de ingrediente: ${mat.nome}. Necessita de ${totalNecessario.toFixed(2)}${mat.unidade}, mas possui apenas ${mat.quantidade_atual.toFixed(2)}${mat.unidade}.`);
      }
    }

    // Spend raw materials
    for (const ing of ingredientes) {
      const mat = this.materiais.find(m => m.id === ing.material_id);
      if (mat) {
        const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
        const totalNecessario = qtdNormalizada * quantidade;
        mat.quantidade_atual -= totalNecessario;
        mat.data_ultima_atualizacao = new Date().toISOString();

        // Record material output log
        const movMat: MovimentacaoMaterial = {
          id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
          material_id: mat.id,
          tipo: 'saida_producao',
          quantidade: totalNecessario,
          observacao: `Gasto em lote de produção: ${quantidade}x ${this.produtos.find(p => p.id === produtoId)?.nome || ''}`,
          criado_em: new Date().toISOString()
        };
        this.movMateriais.unshift(movMat);
      }
    }

    // Add to finished products stock
    let ep = this.estoqueProdutos.find(e => e.produto_id === produtoId);
    if (!ep) {
      ep = {
        id: 'ep_' + Math.random().toString(36).substring(2, 9),
        produto_id: produtoId,
        quantidade_disponivel: 0,
        quantidade_reservada: 0,
        quantidade_minima: 5,
        data_atualizacao: new Date().toISOString()
      };
      this.estoqueProdutos.push(ep);
    }

    ep.quantidade_disponivel += quantidade;
    if (lote) ep.lote = lote;
    if (validade) ep.data_validade = validade;
    ep.data_atualizacao = new Date().toISOString();

    // Record product movement log
    const movProd: MovimentacaoProduto = {
      id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
      produto_id: produtoId,
      tipo: 'entrada_producao',
      quantidade,
      observacao: observacao || `Lote de produção concluído. Lote: ${lote || 'N/A'}. Validade: ${validade || 'N/A'}`,
      criado_em: new Date().toISOString()
    };
    this.movProdutos.unshift(movProd);

    this.recalcularCustosProdutos();
    this.saveAll();
  }

  // ==========================================
  // MÓDULO 4: CLIENTES e PEDIDOS
  // ==========================================

  addCliente(cliente: Omit<Cliente, 'id'>) {
    const novo: Cliente = {
      ...cliente,
      id: 'cli_' + Math.random().toString(36).substring(2, 9)
    };
    this.clientes.push(novo);
    this.saveAll();
    return novo;
  }

  updateCliente(id: string, updates: Partial<Cliente>) {
    this.clientes = this.clientes.map(c => (c.id === id ? { ...c, ...updates } : c));
    this.saveAll();
  }

  deleteCliente(id: string) {
    this.clientes = this.clientes.filter(c => c.id !== id);
    // Delete orders too? Keep for integrity or delete. Let's keep them or set client to deleted. Let's delete to make it simple.
    this.pedidos = this.pedidos.filter(p => p.cliente_id !== id);
    this.saveAll();
  }

  /**
   * Creates/adds a new order.
   * If status starts as 'confirmado', executes stock reservation automatically!
   */
  addPedido(
    pedido: Omit<Pedido, 'id' | 'valor_total' | 'data_pedido' | 'atualizado_em'>, 
    itens: { produto_id: string; quantidade_solicitada: number; preco_unitario: number; observacao?: string }[]
  ) {
    const pedId = 'ped_' + Math.random().toString(36).substring(2, 9);
    
    // Calculates total
    let total = 0;
    const novosItens: ItemPedido[] = itens.map(item => {
      total += item.quantidade_solicitada * item.preco_unitario;
      return {
        id: 'ip_' + Math.random().toString(36).substring(2, 9),
        pedido_id: pedId,
        produto_id: item.produto_id,
        quantidade_solicitada: item.quantidade_solicitada,
        quantidade_produzida: 0,
        preco_unitario: item.preco_unitario,
        observacao: item.observacao
      };
    });

    const novoPedido: Pedido = {
      ...pedido,
      id: pedId,
      data_pedido: new Date().toISOString(),
      valor_total: total,
      atualizado_em: new Date().toISOString()
    };

    this.pedidos.unshift(novoPedido);
    this.itensPedido.push(...novosItens);

    // Business Rule 1: Ao confirmar um pedido -> reservar automaticamente o estoque de produtos acabados
    if (pedido.status === 'confirmado') {
      this.reservarEstoqueParaPedido(pedId, novosItens);
    }

    this.saveAll();
    return pedId;
  }

  /**
   * Action tool: Status transitioner.
   * Supports complex state machine and triggers stock actions:
   * - Transition TO 'confirmado' -> triggers auto reservation
   * - Transition TO 'em_producao' -> verifies raw materials, blocks if insufficient, deducts materials.
   * - Transition TO 'entregue' -> wipes out reservation and completes delivery.
   * - Transition TO 'cancelado' -> release reservations back to available!
   */
  updatePedidoStatus(id: string, novoStatus: PedidoStatus): { success: boolean; error?: string } {
    const ped = this.pedidos.find(p => p.id === id);
    if (!ped) return { success: false, error: 'Pedido não encontrado.' };

    const antigoStatus = ped.status;
    if (antigoStatus === novoStatus) return { success: true };

    const itensDoPedido = this.itensPedido.filter(i => i.pedido_id === id);

    // --- CASE 1: Transitioning to 'confirmado' (and did not hold reservation before)
    if (novoStatus === 'confirmado' && antigoStatus === 'rascunho') {
      this.reservarEstoqueParaPedido(id, itensDoPedido);
    }

    // --- CASE 2: Transitioning to 'em_producao' (if from rascunho, reserve physical stock first)
    if (novoStatus === 'em_producao') {
      if (antigoStatus === 'rascunho') {
        this.reservarEstoqueParaPedido(id, itensDoPedido);
      }

      // Check ingredient viability for the deficient (unreserved) production amount
      const itensFormatados = itensDoPedido.map(item => {
        const prod = this.produtos.find(p => p.id === item.produto_id);
        return {
          produtoId: item.produto_id,
          produtoNome: prod?.nome || 'N/A',
          quantidadeSolicitada: item.quantidade_solicitada
        };
      });

      const analise = analisarEstoqueParaPedido(itensFormatados, this.estoqueProdutos, this.fichas, this.materiais);
      if (!analise.tudoDisponivelEmEstoquePronto && !analise.podeProduzirRestante) {
        // Build clear blocking error message
        const listaFaltante = analise.resumoFaltasMateriais
          .map(f => `${f.materialNome}: faltam ${f.falta.toFixed(2)}${f.unidade}`)
          .join(', ');
        return { 
          success: false, 
          error: `Produção bloqueada! Ingredientes insuficientes. Necessário repor matérias-primas: ${listaFaltante}.`
        };
      }

      // If ingreds are sufficient, transition to production and actually DEDUCT the ingredients for the unreserved part!
      // This is "Botão 'Iniciar Produção' que reserva/consome os materiais necessários"
      this.consumirMateriaisParaPedidoProducao(id, itensDoPedido);
    }

    // --- CASE 3: Transitioning to 'pronto' - assumes all items are cooked and now sitting in available or reserved
    if (novoStatus === 'pronto') {
      // If we jumped straight or we are completing production, ensure all requested items are in stock and marked as reserved
      // To keep it simple, we ensure the items requested are moved from "to produce" to physical "reserved"
      this.marcarPedidoProntoEstoque(id, itensDoPedido);
    }

    // --- CASE 4: Transitioning to 'entregue' (Rule 4: dar baixa no estoque reservado)
    if (novoStatus === 'entregue') {
      if (antigoStatus !== 'pronto' && antigoStatus !== 'em_producao') {
        // Enforce a structured workflow or auto-resolve materials
        this.marcarPedidoProntoEstoque(id, itensDoPedido);
      }
      this.darBaixaEntregaPedido(id, itensDoPedido);
    }

    // --- CASE 5: Transitioning to 'cancelado' (release reservations back to available and cancel)
    if (novoStatus === 'cancelado') {
      this.liberarReservasPedido(id, itensDoPedido);
    }

    // Apply status change
    ped.status = novoStatus;
    ped.atualizado_em = new Date().toISOString();
    this.saveAll();
    return { success: true };
  }

  // Helper: Reservation system logic
  private reservarEstoqueParaPedido(pedidoId: string, itens: ItemPedido[]) {
    itens.forEach(item => {
      const ep = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (ep) {
        // How many do we need?
        const precisa = item.quantidade_solicitada;
        // How many are free?
        const disponivel = ep.quantidade_disponivel;
        // Reserve up to available
        const reservarAte = Math.min(precisa, disponivel);
        
        ep.quantidade_disponivel -= reservarAte;
        ep.quantidade_reservada += reservarAte;
        ep.data_atualizacao = new Date().toISOString();
      }
    });
  }

  // Helper: Release reservation logic on Cancellation
  private liberarReservasPedido(pedidoId: string, itens: ItemPedido[]) {
    itens.forEach(item => {
      const ep = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (ep) {
        // Release up to requested (assumes we reserved it)
        const reservadoDesseItem = Math.min(item.quantidade_solicitada, ep.quantidade_reservada);
        ep.quantidade_reservada -= reservadoDesseItem;
        ep.quantidade_disponivel += reservadoDesseItem;
        ep.data_atualizacao = new Date().toISOString();
      }
    });
  }

  // Helper: Deducts ingredients for the deficit amount of the order when starting production
  private consumirMateriaisParaPedidoProducao(pedidoId: string, itens: ItemPedido[]) {
    itens.forEach(item => {
      const ep = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      // Deficit is what we can't grab from physically available stock
      const jaReservados = ep ? Math.min(item.quantidade_solicitada, ep.quantidade_reservada) : 0;
      const deficitAProduzir = item.quantidade_solicitada - jaReservados;

      if (deficitAProduzir > 0) {
        const ingredientes = this.fichas.filter(f => f.produto_id === item.produto_id);
        ingredientes.forEach(ing => {
          const mat = this.materiais.find(m => m.id === ing.material_id);
          if (mat) {
            const qtdNormalizada = normalizarQuantidade(ing.quantidade_necessaria, ing.unidade, mat.unidade);
            const totalGasto = qtdNormalizada * deficitAProduzir;
            
            mat.quantidade_atual = Math.max(0, mat.quantidade_atual - totalGasto);
            mat.data_ultima_atualizacao = new Date().toISOString();

            // Log material spending
            this.movMateriais.unshift({
              id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
              material_id: mat.id,
              tipo: 'saida_producao',
              quantidade: totalGasto,
              observacao: `Gasto iniciado p/ produção do Pedido #${pedidoId.substring(4)}`,
              criado_em: new Date().toISOString()
            });
          }
        });
      }
    });
  }

  // Helper: Move cooked items from deficit to reserved in inventory once order status is PRONTO
  private marcarPedidoProntoEstoque(pedidoId: string, itens: ItemPedido[]) {
    itens.forEach(item => {
      const ep = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (ep) {
        const faltavaReservar = item.quantidade_solicitada - ep.quantidade_reservada;
        if (faltavaReservar > 0) {
          // Add directly to reserved to lock it in
          ep.quantidade_reservada += faltavaReservar;
          ep.data_atualizacao = new Date().toISOString();

          // Log product entrance from production
          this.movProdutos.unshift({
            id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
            produto_id: item.produto_id,
            tipo: 'entrada_producao',
            quantidade: faltavaReservar,
            observacao: `Saída do forno / pronto para Pedido #${pedidoId.substring(4)}`,
            criado_em: new Date().toISOString()
          });
        }
      }
    });
  }

  // Helper: Rule 4 - Actually delivers, wipes out matching reservations
  private darBaixaEntregaPedido(pedidoId: string, itens: ItemPedido[]) {
    itens.forEach(item => {
      const ep = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (ep) {
        const entregarQuantidade = item.quantidade_solicitada;
        ep.quantidade_reservada = Math.max(0, ep.quantidade_reservada - entregarQuantidade);
        ep.data_atualizacao = new Date().toISOString();

        // Record delivery outgoing physical movement
        this.movProdutos.unshift({
          id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
          produto_id: item.produto_id,
          tipo: 'saida_pedido',
          quantidade: entregarQuantidade,
          pedido_id: pedidoId,
          observacao: `Entrega de Pedido #${pedidoId.substring(4)} concluída.`,
          criado_em: new Date().toISOString()
        });
      }
    });
  }

  deletePedido(id: string) {
    const ped = this.pedidos.find(p => p.id === id);
    if (ped && ped.status !== 'cancelado' && ped.status !== 'entregue') {
      // Release any active reservations
      const itens = this.itensPedido.filter(i => i.pedido_id === id);
      this.liberarReservasPedido(id, itens);
    }
    this.pedidos = this.pedidos.filter(p => p.id !== id);
    this.itensPedido = this.itensPedido.filter(i => i.pedido_id !== id);
    this.saveAll();
  }
}
