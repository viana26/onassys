import { Material, Produto, FichaTecnicaItem, EstoqueProduto, Cliente, Pedido, ItemPedido, MovimentacaoMaterial, MovimentacaoProduto, Unidade, Categoria, StatusPedido, TipoMovimentacao, TipoCliente, Fornecedor, Permissao, Perfil, CategoriaFinanceiro, LancamentoFinanceiro, PlanejamentoCompra, PerfilUsuario, PerfilPermissao, DadosEmpresa } from '../types';
import { calcularCustoProducao, normalizarQuantidade } from './calculos';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { deleteProdutoImage, isStorageUrl } from './imageUpload';

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

  unidades: Unidade[] = [];
  categorias: Categoria[] = [];
  statusPedido: StatusPedido[] = [];
  tiposMovimentacao: TipoMovimentacao[] = [];
  tiposCliente: TipoCliente[] = [];
  fornecedores: Fornecedor[] = [];
  permissoes: Permissao[] = [];
  perfis: Perfil[] = [];
  perfisPermissoes: PerfilPermissao[] = [];
  categoriasFinanceiro: CategoriaFinanceiro[] = [];

  lancamentos: LancamentoFinanceiro[] = [];
  planejamentoCompras: PlanejamentoCompra[] = [];
  perfisUsuarios: PerfilUsuario[] = [];

  currentUserId: string | null = null;
  currentUserPermissionsCache: string[] = [];

  loading = true;
  error: string | null = null;
  errorType: 'network' | 'server' | null = null;
  dadosEmpresa: DadosEmpresa | null = null;
  private onUpdateCallbacks: (() => void)[] = [];

  constructor() {
    this.loadData();
  }

  subscribe(callback: () => void) {
    this.onUpdateCallbacks.push(callback);
    return () => { this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback); };
  }

  private notify() { this.onUpdateCallbacks.forEach(cb => cb()); }

  clearError() { this.error = null; this.errorType = null; this.notify(); }

  private setError(msg: string, type: 'network' | 'server') {
    this.error = msg;
    this.errorType = type;
    this.notify();
  }

  // ================================================
  // LOOKUP HELPERS
  // ================================================
  unidadeSigla(id: number): string { return this.unidades.find(u => u.id === id)?.sigla || `?(${id})`; }
  unidadeNome(id: number): string { return this.unidades.find(u => u.id === id)?.nome || `?(${id})`; }
  categoriaNome(id: number): string { return this.categorias.find(c => c.id === id)?.nome || `?(${id})`; }
  statusNome(id: number): string { return this.statusPedido.find(s => s.id === id)?.nome || `?(${id})`; }
  tipoClienteNome(id: number): string { return this.tiposCliente.find(t => t.id === id)?.nome || `?(${id})`; }
  fornecedorNome(id: number): string { return this.fornecedores.find(f => f.id === id)?.nome_fantasia || `?(${id})`; }
  perfilNome(id: number): string { return this.perfis.find(p => p.id === id)?.nome || `?(${id})`; }
  tipoMovNome(id: number): string { return this.tiposMovimentacao.find(t => t.id === id)?.nome || `?(${id})`; }
  categoriaFinanceiroNome(id: number): string { return this.categoriasFinanceiro.find(c => c.id === id)?.nome || `?(${id})`; }
  private getCategoriaEstornoId(): number {
    return this.categoriasFinanceiro.find(c => c.nome === 'Estorno')?.id || 0;
  }

  getEstornoPendente(): Pedido[] {
    return this.pedidos.filter(p => {
      if (p.status_id !== 6) return false;
      const receitas = this.lancamentos.filter(l => l.pedido_id === p.id && l.tipo === 'receita');
      if (receitas.length === 0) return false;
      const estornado = receitas.every(r => this.lancamentos.some(l =>
        l.pedido_id === p.id &&
        l.tipo === 'despesa' &&
        l.valor === r.valor &&
        l.forma_pagamento === r.forma_pagamento
      ));
      return !estornado;
    });
  }

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    if (!userId) { this.currentUserPermissionsCache = []; return; }
    const perfilUser = this.perfisUsuarios.find(u => u.id === userId);
    if (!perfilUser) { this.currentUserPermissionsCache = []; return; }
    const permissaoIds = this.perfisPermissoes
      .filter(pp => pp.perfil_id === perfilUser.perfil_id)
      .map(pp => pp.permissao_id);
    this.currentUserPermissionsCache = this.permissoes
      .filter(p => permissaoIds.includes(p.id))
      .map(p => p.chave);
  }

  hasPermission(chave: string): boolean {
    return this.currentUserPermissionsCache.includes(chave);
  }

  async ensureUserProfile(userId: string, nome: string, perfilId?: number) {
    const cached = this.perfisUsuarios.find(u => u.id === userId);
    if (cached) {
      this.currentUserId = userId;
      if (!this.loading) this.setCurrentUser(userId);
      return;
    }
    const { data: existing } = await supabase
      .from('perfis_usuario')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (existing) {
      this.perfisUsuarios.push(existing as PerfilUsuario);
      this.saveToLocalStorage();
      this.currentUserId = userId;
      if (!this.loading) this.setCurrentUser(userId);
      return;
    }
    const { error } = await supabase.from('perfis_usuario').insert({
      id: userId,
      nome,
      perfil_id: perfilId ?? 3,
      ativo: true,
    });
    if (!error) {
      this.perfisUsuarios.push({
        id: userId,
        nome,
        perfil_id: perfilId ?? 3,
        ativo: true,
      });
      this.saveToLocalStorage();
    }
    this.currentUserId = userId;
    if (!this.loading) this.setCurrentUser(userId);
  }

  // ================================================
  // PERSISTÊNCIA LOCAL (cache)
  // ================================================
  private saveToLocalStorage() {
    try {
      const data: Record<string, unknown> = {
        materiais: this.materiais, produtos: this.produtos,
        fichas: this.fichas, estoqueProdutos: this.estoqueProdutos,
        clientes: this.clientes, pedidos: this.pedidos,
        itensPedido: this.itensPedido, movMateriais: this.movMateriais,
        movProdutos: this.movProdutos, lancamentos: this.lancamentos,
        planejamentoCompras: this.planejamentoCompras,
        perfisUsuarios: this.perfisUsuarios,
        unidades: this.unidades, categorias: this.categorias,
        statusPedido: this.statusPedido, tiposCliente: this.tiposCliente,
        fornecedores: this.fornecedores, permissoes: this.permissoes,
        perfis: this.perfis, perfisPermissoes: this.perfisPermissoes,
        tiposMovimentacao: this.tiposMovimentacao,
        categoriasFinanceiro: this.categoriasFinanceiro,
        dadosEmpresa: this.dadosEmpresa,
      };
      Object.entries(data).forEach(([key, val]) => localStorage.setItem(`oc_${key}`, JSON.stringify(val)));
    } catch { /* quota exceeded */ }
  }

  private loadFromLocalStorage() {
    try {
      const get = <T>(k: string, fallback: T): T => {
        const d = localStorage.getItem(`oc_${k}`);
        return d ? JSON.parse(d) : fallback;
      };
      this.materiais = get('materiais', []);
      this.produtos = get('produtos', []);
      this.fichas = get('fichas', []);
      this.estoqueProdutos = get('estoqueProdutos', []);
      this.clientes = get('clientes', []);
      this.pedidos = get('pedidos', []);
      this.itensPedido = get('itensPedido', []);
      this.movMateriais = get('movMateriais', []);
      this.movProdutos = get('movProdutos', []);
      this.lancamentos = get('lancamentos', []);
      this.planejamentoCompras = get('planejamentoCompras', []);
      this.perfisUsuarios = get('perfisUsuarios', []);
      this.unidades = get('unidades', []);
      this.categorias = get('categorias', []);
      this.statusPedido = get('statusPedido', []);
      this.tiposCliente = get('tiposCliente', []);
      this.fornecedores = get('fornecedores', []);
      this.permissoes = get('permissoes', []);
      this.perfis = get('perfis', []);
      this.perfisPermissoes = get('perfisPermissoes', []);
      this.tiposMovimentacao = get('tiposMovimentacao', []);
      this.categoriasFinanceiro = get('categoriasFinanceiro', []);
      this.dadosEmpresa = get<DadosEmpresa | null>('dadosEmpresa', null);
    } catch { /* ignore */ }
  }

  // ================================================
  // SUPABASE HELPERS
  // ================================================
  private async fetchAll<T>(table: string, order?: string): Promise<T[]> {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from(table).select('*');
    if (order) q = q.order(order.split(' ')[0], { ascending: order.includes('ASC') });
    const { data } = await q;
    return (data || []) as T[];
  }

  private async supabaseInsert(table: string, data: Record<string, unknown>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from(table).insert(data);
      if (error) { this.setError(error.message + ' — Contate o supervisor.', 'server'); return false; }
      return true;
    } catch {
      this.setError('Sem conexão com o servidor. Verifique sua internet.', 'network');
      return false;
    }
  }
  private async supabaseUpdate(table: string, id: string, data: Record<string, unknown>): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from(table).update(data).eq('id', id);
      if (error) { this.setError(error.message + ' — Contate o supervisor.', 'server'); return false; }
      return true;
    } catch {
      this.setError('Sem conexão com o servidor. Verifique sua internet.', 'network');
      return false;
    }
  }
  private async supabaseDelete(table: string, id: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) { this.setError(error.message + ' — Contate o supervisor.', 'server'); return false; }
      return true;
    } catch {
      this.setError('Sem conexão com o servidor. Verifique sua internet.', 'network');
      return false;
    }
  }

  // ================================================
  // LOAD LOOKUPS
  // ================================================
  async loadLookups() {
    if (!isSupabaseConfigured()) return;
      const [
        u, cat, st, tm, tc, f, perm, perf, pp, cf
      ] = await Promise.all([
        this.fetchAll<Unidade>('unidades'),
        this.fetchAll<Categoria>('categorias'),
        this.fetchAll<StatusPedido>('status_pedido'),
        this.fetchAll<TipoMovimentacao>('tipos_movimentacao'),
        this.fetchAll<TipoCliente>('tipos_cliente'),
        this.fetchAll<Fornecedor>('fornecedores'),
        this.fetchAll<Permissao>('permissoes'),
        this.fetchAll<Perfil>('perfis'),
        this.fetchAll<PerfilPermissao>('perfis_permissoes'),
        this.fetchAll<CategoriaFinanceiro>('categorias_financeiro'),
      ]);
      this.unidades = u; this.categorias = cat; this.statusPedido = st;
      this.tiposMovimentacao = tm; this.tiposCliente = tc; this.fornecedores = f;
      this.permissoes = perm; this.perfis = perf; this.perfisPermissoes = pp; this.categoriasFinanceiro = cf;
      await this.ensureFornecedorPermissions();
  }

  private async ensureFornecedorPermissions() {
    if (!isSupabaseConfigured()) return;
    const hasPerm = this.permissoes.some(p => p.chave === 'fornecedores.ver');
    if (hasPerm) return;

    const novasPerms = [
      { chave: 'fornecedores.ver', nome: 'Ver Fornecedores', grupo: 'Fornecedores' },
      { chave: 'fornecedores.criar', nome: 'Criar Fornecedores', grupo: 'Fornecedores' },
      { chave: 'fornecedores.editar', nome: 'Editar Fornecedores', grupo: 'Fornecedores' },
      { chave: 'fornecedores.excluir', nome: 'Excluir Fornecedores', grupo: 'Fornecedores' },
    ];

    const inserted: Permissao[] = [];
    for (const p of novasPerms) {
      const { data } = await supabase.from('permissoes').insert(p).select().single();
      if (data) inserted.push(data as Permissao);
    }
    if (inserted.length === 0) return;

    this.permissoes.push(...inserted);
    const perfis = this.perfis;

    for (const permissao of inserted) {
      for (const perfil of perfis) {
        const podeTer =
          perfil.nome === 'Admin' ||
          perfil.nome === 'Gerente' ||
          (perfil.nome === 'Operador' && permissao.chave !== 'fornecedores.excluir') ||
          (perfil.nome === 'Visualizador' && permissao.chave === 'fornecedores.ver');

        if (podeTer) {
          await supabase.from('perfis_permissoes').insert({
            perfil_id: perfil.id,
            permissao_id: permissao.id,
          });
          this.perfisPermissoes.push({ perfil_id: perfil.id, permissao_id: permissao.id });
        }
      }
    }

    this.saveToLocalStorage();
    if (this.currentUserId) this.setCurrentUser(this.currentUserId);
  }

  // ================================================
  // LOAD DATA
  // ================================================
  async loadFromSupabase() {
    if (!isSupabaseConfigured()) return false;
    try {
      const [m, p, f, e, c, pd, ip, mm, mp, l, pl, pu] = await Promise.all([
        this.fetchAll<Material>('materiais'),
        this.fetchAll<Produto>('produtos'),
        this.fetchAll<FichaTecnicaItem>('fichas_tecnicas'),
        this.fetchAll<EstoqueProduto>('estoque_produtos'),
        this.fetchAll<Cliente>('clientes'),
        this.fetchAll<Pedido>('pedidos', 'data_pedido DESC'),
        this.fetchAll<ItemPedido>('itens_pedido'),
        this.fetchAll<MovimentacaoMaterial>('movimentacoes_materiais', 'criado_em DESC'),
        this.fetchAll<MovimentacaoProduto>('movimentacoes_produtos', 'criado_em DESC'),
        this.fetchAll<LancamentoFinanceiro>('lancamentos_financeiros', 'data_lancamento DESC'),
        this.fetchAll<PlanejamentoCompra>('planejamento_compras'),
        this.fetchAll<PerfilUsuario>('perfis_usuario'),
      ]);
      this.materiais = m; this.produtos = p; this.fichas = f;
      this.estoqueProdutos = e; this.clientes = c; this.pedidos = pd;
      this.itensPedido = ip; this.movMateriais = mm; this.movProdutos = mp;
      this.lancamentos = l; this.planejamentoCompras = pl; this.perfisUsuarios = pu;
      return true;
    } catch { return false; }
  }

  private async loadData() {
    this.loading = true; this.notify();
    await this.loadLookups();
    const ok = await this.loadFromSupabase();
    if (!ok) this.loadFromLocalStorage();
    this.recalcularValoresPedidos();
    this.loading = false;
    this.recalcularCustosProdutos();
    this.saveToLocalStorage();
    if (this.currentUserId) this.setCurrentUser(this.currentUserId);
    this.notify();
  }

  async refresh() {
    this.loading = true; this.notify();
    await this.loadLookups();
    await this.loadFromSupabase();
    this.recalcularValoresPedidos();
    this.loading = false;
    this.recalcularCustosProdutos();
    this.saveToLocalStorage();
    if (this.currentUserId) this.setCurrentUser(this.currentUserId);
    this.notify();
  }

  private recalcularValoresPedidos() {
    for (const pedido of this.pedidos) {
      const total = this.itensPedido
        .filter(i => i.pedido_id === pedido.id)
        .reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
      if (pedido.valor_total !== total) {
        pedido.valor_total = total;
        this.supabaseUpdate('pedidos', pedido.id, { valor_total: total } as unknown as Record<string, unknown>);
      }
    }
  }

  async recalcularCustosProdutos() {
    this.produtos = this.produtos.map(p => ({
      ...p,
      custo_producao_calculado: calcularCustoProducao(p.id, this.fichas, this.materiais, this.unidades)
    }));
  }

  // ================================================
  // CRUD — MATERIAIS
  // ================================================
  async addMaterial(data: { nome: string; unidade_id: number; custo_unitario: number; quantidade_atual?: number; quantidade_minima?: number; fornecedor_id?: number }) {
    const novo: Material = {
      id: 'mat_' + Math.random().toString(36).substring(2, 9),
      nome: data.nome,
      unidade_id: data.unidade_id,
      custo_unitario: data.custo_unitario,
      quantidade_atual: data.quantidade_atual ?? 0,
      quantidade_minima: data.quantidade_minima ?? 0,
      fornecedor_id: data.fornecedor_id,
      data_ultima_atualizacao: new Date().toISOString()
    };
    const ok = await this.supabaseInsert('materiais', novo as unknown as Record<string, unknown>);
    if (ok) { this.materiais.push(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateMaterial(id: string, updates: Partial<Material>) {
    const idx = this.materiais.findIndex(m => m.id === id);
    if (idx === -1) return;
    const updated = { ...this.materiais[idx], ...updates, data_ultima_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseUpdate('materiais', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.materiais[idx] = updated; this.saveToLocalStorage(); this.notify(); }
  }

  async deleteMaterial(id: string) {
    const ok = await this.supabaseDelete('materiais', id);
    if (ok) {
      this.materiais = this.materiais.filter(m => m.id !== id);
      this.fichas = this.fichas.filter(f => f.material_id !== id);
      this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify();
    }
  }

  async lancarEntradaMaterial(id: string, quantidade: number, custoUnitario?: number, observacao?: string, criarDespesa?: boolean) {
    const mat = this.materiais.find(m => m.id === id);
    if (!mat) return;

    const unitPrice = custoUnitario !== undefined && custoUnitario >= 0 ? custoUnitario : mat.custo_unitario;
    const mov: MovimentacaoMaterial = {
      id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
      material_id: id,
      tipo_id: 1,
      quantidade,
      observacao,
      valor_pago: unitPrice * quantidade,
      custo_unitario: unitPrice,
      criado_em: new Date().toISOString()
    };

    const fornecedor = mat.fornecedor_id ? this.fornecedores.find(f => f.id === mat.fornecedor_id) : undefined;

    const dadosMat = {
      ...mat,
      quantidade_atual: mat.quantidade_atual + quantidade,
      custo_unitario: unitPrice,
      data_ultima_atualizacao: new Date().toISOString(),
    };
    const okMat = await this.supabaseUpdate('materiais', id, dadosMat as unknown as Record<string, unknown>);
    const okMov = await this.supabaseInsert('movimentacoes_materiais', mov as unknown as Record<string, unknown>);
    if (okMat && okMov) {
      mat.quantidade_atual = dadosMat.quantidade_atual;
      mat.custo_unitario = dadosMat.custo_unitario;
      mat.data_ultima_atualizacao = dadosMat.data_ultima_atualizacao;
      this.movMateriais.unshift(mov);
      if (criarDespesa) {
        const catDespesa = this.categoriasFinanceiro.find(c => c.nome === 'Matéria-Prima' || c.tipo === 'despesa');
        const despesa: LancamentoFinanceiro = {
          id: crypto.randomUUID(), criado_em: new Date().toISOString(),
          data_lancamento: new Date().toISOString().split('T')[0],
          valor: unitPrice * quantidade, tipo: 'despesa',
          categoria_id: catDespesa?.id || 1,
          descricao: `Compra de ${mat.nome}${fornecedor ? ` - ${fornecedor.nome_fantasia}` : ''}`,
          movimentacao_id: mov.id,
        };
        await this.supabaseInsert('lancamentos_financeiros', despesa as unknown as Record<string, unknown>);
        this.lancamentos.unshift(despesa);
      }
      this.saveToLocalStorage(); this.notify();
    }
  }

  // ================================================
  // CRUD — PRODUTOS
  // ================================================
  async addProduto(data: Partial<Produto>) {
    const novo: Produto = {
      nome: data.nome || '',
      categoria_id: data.categoria_id || 5,
      descricao: data.descricao,
      unidade_producao_id: data.unidade_producao_id || 5,
      tempo_producao_minutos: data.tempo_producao_minutos ?? 0,
      custo_producao_calculado: data.custo_producao_calculado ?? 0,
      ativo: data.ativo ?? true,
      margem_lucro: data.margem_lucro ?? 0,
      preco_venda: data.preco_venda ?? 0,
      imagem: data.imagem,
      id: 'prod_' + Math.random().toString(36).substring(2, 9)
    };
    const ok = await this.supabaseInsert('produtos', novo as unknown as Record<string, unknown>);
    if (ok) { this.produtos.push(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateProduto(id: string, updates: Partial<Produto>) {
    const idx = this.produtos.findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated = { ...this.produtos[idx], ...updates };
    const ok = await this.supabaseUpdate('produtos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.produtos[idx] = updated; this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteProduto(id: string) {
    const p = this.produtos.find(x => x.id === id);
    const ok = await this.supabaseDelete('produtos', id);
    if (ok) {
      if (p?.imagem && isStorageUrl(p.imagem)) deleteProdutoImage(p.imagem).catch(() => {});
      this.produtos = this.produtos.filter(x => x.id !== id);
      this.fichas = this.fichas.filter(f => f.produto_id !== id);
      this.estoqueProdutos = this.estoqueProdutos.filter(e => e.produto_id !== id);
      this.saveToLocalStorage(); this.notify();
    }
  }

  // ================================================
  // CRUD — FICHAS TÉCNICAS
  // ================================================
  async addFichaTecnica(ficha: Omit<FichaTecnicaItem, 'id'>) {
    const nova: FichaTecnicaItem = { ...ficha, id: 'ficha_' + Math.random().toString(36).substring(2, 9) };
    const ok = await this.supabaseInsert('fichas_tecnicas', nova as unknown as Record<string, unknown>);
    if (ok) { this.fichas.push(nova); this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
    return nova;
  }

  async updateFichaTecnica(id: string, updates: Partial<FichaTecnicaItem>) {
    const idx = this.fichas.findIndex(f => f.id === id);
    if (idx === -1) return;
    const updated = { ...this.fichas[idx], ...updates };
    const ok = await this.supabaseUpdate('fichas_tecnicas', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.fichas[idx] = updated; this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteFichaTecnica(id: string) {
    const ok = await this.supabaseDelete('fichas_tecnicas', id);
    if (ok) { this.fichas = this.fichas.filter(f => f.id !== id); this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
  }

  // ================================================
  // CRUD — ESTOQUE PRODUTOS
  // ================================================
  async addEstoqueProduto(estoque: Omit<EstoqueProduto, 'id' | 'data_atualizacao'>) {
    const novo: EstoqueProduto = { ...estoque, id: 'est_' + Math.random().toString(36).substring(2, 9), data_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseInsert('estoque_produtos', novo as unknown as Record<string, unknown>);
    if (ok) { this.estoqueProdutos.push(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateEstoqueProduto(id: string, updates: Partial<EstoqueProduto>) {
    const idx = this.estoqueProdutos.findIndex(e => e.id === id);
    if (idx === -1) return;
    const updated = { ...this.estoqueProdutos[idx], ...updates, data_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseUpdate('estoque_produtos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.estoqueProdutos[idx] = updated; this.saveToLocalStorage(); this.notify(); }
  }

  async updateEstoqueProdutoConfig(id: string, updates: Partial<EstoqueProduto>) { return this.updateEstoqueProduto(id, updates); }

  async deleteEstoqueProduto(id: string) {
    const ok = await this.supabaseDelete('estoque_produtos', id);
    if (ok) { this.estoqueProdutos = this.estoqueProdutos.filter(e => e.id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  async lancarLoteProducao(produtoId: string, quantidade: number, dataValidade?: string, lote?: string, observacao?: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.lancarProducao([{ produto_id: produtoId, quantidade_solicitada: quantidade }], undefined);
    if (!result.success) return result;

    // lancarProducao already consumed insumos and added to estoque_produtos
    // Now add lote/validade if provided
    if (dataValidade || lote) {
      const estoque = this.estoqueProdutos.find(e => e.produto_id === produtoId);
      if (estoque) {
        if (dataValidade) estoque.data_validade = dataValidade;
        if (lote) estoque.lote = lote;
        estoque.data_atualizacao = new Date().toISOString();
        await this.supabaseUpdate('estoque_produtos', estoque.id, estoque as unknown as Record<string, unknown>);
        this.saveToLocalStorage(); this.notify();
      }
    }
    return { success: true };
  }

  // ================================================
  // CRUD — CLIENTES
  // ================================================
  async addCliente(data: { nome: string; tipo_id: number; telefone?: string; email?: string; endereco?: string; observacoes?: string }) {
    const novo: Cliente = {
      ...data, telefone: data.telefone || '', email: data.email || '', endereco: data.endereco || '',
      id: 'cli_' + Math.random().toString(36).substring(2, 9)
    };
    const ok = await this.supabaseInsert('clientes', novo as unknown as Record<string, unknown>);
    if (ok) { this.clientes.push(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateCliente(id: string, updates: Partial<Cliente>) {
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx === -1) return;
    const updated = { ...this.clientes[idx], ...updates };
    const ok = await this.supabaseUpdate('clientes', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.clientes[idx] = updated; this.saveToLocalStorage(); this.notify(); }
  }

  async deleteCliente(id: string) {
    const ok = await this.supabaseDelete('clientes', id);
    if (ok) { this.clientes = this.clientes.filter(c => c.id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  // ================================================
  // CRUD — PEDIDOS
  // ================================================
  async addPedido(data: Partial<Pedido>) {
    const novo: Pedido = {
      cliente_id: data.cliente_id || '',
      status_id: data.status_id || 1,
      data_entrega_prevista: data.data_entrega_prevista || new Date().toISOString(),
      observacoes: data.observacoes, criado_by: data.criado_by || '', valor_total: data.valor_total ?? 0,
      id: 'ped_' + Math.random().toString(36).substring(2, 9),
      data_pedido: new Date().toISOString(), atualizado_em: new Date().toISOString()
    };
    const ok = await this.supabaseInsert('pedidos', novo as unknown as Record<string, unknown>);
    if (ok) { this.pedidos.push(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updatePedido(id: string, updates: Partial<Pedido>) {
    const idx = this.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated = { ...this.pedidos[idx], ...updates, atualizado_em: new Date().toISOString() };
    const ok = await this.supabaseUpdate('pedidos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.pedidos[idx] = updated; this.saveToLocalStorage(); this.notify(); }
  }

  async updatePedidoStatus(id: string, status_id: number): Promise<{ success: boolean; error?: string }> {
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    const fromStatus = pedido.status_id;

    // 1 → 2: confirmar pedido (reservar estoque disponível)
    if (fromStatus === 1 && status_id === 2) {
      const itensConfirm = this.itensPedido.filter(i => i.pedido_id === id);
      for (const it of itensConfirm) {
        const estoque = this.estoqueProdutos.find(e => e.produto_id === it.produto_id);
        if (estoque) {
          const moverQtd = Math.min(it.quantidade_solicitada, estoque.quantidade_disponivel);
          estoque.quantidade_disponivel -= moverQtd;
          estoque.quantidade_reservada += moverQtd;
          estoque.data_atualizacao = new Date().toISOString();
          await this.supabaseUpdate('estoque_produtos', estoque.id, estoque as unknown as Record<string, unknown>);
        }
      }
    }

    // 2 → 3: iniciar produção
    if (fromStatus === 2 && status_id === 3) {
      const itens = this.itensPedido.filter(i => i.pedido_id === id);
      const result = await this.lancarProducao(itens, id);
      if (!result.success) return result;
    }

    // Cancelamento (status 6): liberar reservas
    if (status_id === 6) {
      const itensCanc = this.itensPedido.filter(i => i.pedido_id === id);
      for (const it of itensCanc) {
        const estoque = this.estoqueProdutos.find(e => e.produto_id === it.produto_id);
        if (estoque) {
          estoque.quantidade_reservada -= it.quantidade_solicitada;
          estoque.quantidade_disponivel += it.quantidade_solicitada;
          estoque.data_atualizacao = new Date().toISOString();
          await this.supabaseUpdate('estoque_produtos', estoque.id, estoque as unknown as Record<string, unknown>);
        }
      }
    }

    // 4 → 5: entregar — baixar estoque de produtos
    if (fromStatus === 4 && status_id === 5) {
      const result = await this.lancarSaidaPedido(id);
      if (!result.success) return result;
    }

    try {
      await this.updatePedido(id, { status_id });
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Erro' };
    }
  }

  async lancarProducao(itens: Array<{ produto_id: string; quantidade_solicitada: number }>, pedidoId?: string): Promise<{ success: boolean; error?: string }> {
    const materiaisUsados: Record<string, { material: Material; ficha: FichaTecnicaItem; qtdNeeded: number }[]> = {};

    for (const item of itens) {
      const fichas = this.fichas.filter(f => f.produto_id === item.produto_id);
      const produto = this.produtos.find(p => p.id === item.produto_id);
      if (!produto) return { success: false, error: `Produto não encontrado: ${item.produto_id}` };

      for (const ficha of fichas) {
        const mat = this.materiais.find(m => m.id === ficha.material_id);
        if (!mat) return { success: false, error: `Ingrediente não encontrado na ficha de "${produto.nome}"` };

        const qtdNeeded = normalizarQuantidade(
          ficha.quantidade_necessaria * item.quantidade_solicitada,
          ficha.unidade_id, mat.unidade_id, this.unidades
        );

        if (mat.quantidade_atual < qtdNeeded) {
          const falta = qtdNeeded - mat.quantidade_atual;
          return {
            success: false,
            error: `Insumo insuficiente: "${mat.nome}". Tem ${mat.quantidade_atual.toFixed(2)}${this.unidadeSigla(mat.unidade_id)}, precisa ${qtdNeeded.toFixed(2)}${this.unidadeSigla(mat.unidade_id)}. Compre mais ${falta.toFixed(2)}${this.unidadeSigla(mat.unidade_id)} antes de produzir.`
          };
        }

        if (!materiaisUsados[mat.id]) materiaisUsados[mat.id] = [];
        materiaisUsados[mat.id].push({ material: mat, ficha, qtdNeeded });
      }
    }

    // Consumir insumos
    for (const matId of Object.keys(materiaisUsados)) {
       const totalQtd = Number(materiaisUsados[matId].reduce((s, e) => s + e.qtdNeeded, 0).toFixed(3));
      const mat = this.materiais.find(m => m.id === matId)!;
      const dadosMat = {
        ...mat,
        quantidade_atual: Number((mat.quantidade_atual - totalQtd).toFixed(3)),
        data_ultima_atualizacao: new Date().toISOString(),
      };
      if (await this.supabaseUpdate('materiais', matId, dadosMat as unknown as Record<string, unknown>)) {
        mat.quantidade_atual = dadosMat.quantidade_atual;
        mat.data_ultima_atualizacao = dadosMat.data_ultima_atualizacao;
      }

      const mov: MovimentacaoMaterial = {
        id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
        material_id: matId, tipo_id: 2, quantidade: totalQtd,
        observacao: pedidoId ? `Produção pedido ${pedidoId}` : 'Produção avulsa',
        criado_em: new Date().toISOString()
      };
      if (await this.supabaseInsert('movimentacoes_materiais', mov as unknown as Record<string, unknown>)) {
        this.movMateriais.unshift(mov);
      }
    }

    // Gerar produtos + movimentações
    for (const item of itens) {
      const produto = this.produtos.find(p => p.id === item.produto_id)!;
      let estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);

if (estoque) {
    if (!pedidoId) {
        estoque.quantidade_reservada += item.quantidade_solicitada;
    }
    estoque.data_atualizacao = new Date().toISOString();
    await this.supabaseUpdate('estoque_produtos', estoque.id, estoque as unknown as Record<string, unknown>);
} else {
    estoque = {
        id: 'est_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id, quantidade_disponivel: 0,
        quantidade_reservada: item.quantidade_solicitada, quantidade_minima: 0, data_atualizacao: new Date().toISOString()
    };
    await this.supabaseInsert('estoque_produtos', estoque as unknown as Record<string, unknown>);
    this.estoqueProdutos.push(estoque);
}

      const movProd: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id, tipo_id: 4, quantidade: item.quantidade_solicitada,
        pedido_id: pedidoId, criado_em: new Date().toISOString()
      };
      if (await this.supabaseInsert('movimentacoes_produtos', movProd as unknown as Record<string, unknown>)) {
        this.movProdutos.unshift(movProd);
      }
    }

    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  async deletePedido(id: string) {
    const ok = await this.supabaseDelete('pedidos', id);
    if (ok) { this.pedidos = this.pedidos.filter(p => p.id !== id); this.itensPedido = this.itensPedido.filter(i => i.pedido_id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  // ================================================
  // CRUD — ITENS PEDIDO
  // ================================================
  async addItemPedido(item: Omit<ItemPedido, 'id'>) {
    const novo: ItemPedido = { ...item, id: 'item_' + Math.random().toString(36).substring(2, 9) };
    const ok = await this.supabaseInsert('itens_pedido', novo as unknown as Record<string, unknown>);
    if (ok) {
      this.itensPedido.push(novo);
      const pedido = this.pedidos.find(p => p.id === item.pedido_id);
      if (pedido) {
        pedido.valor_total = this.itensPedido.filter(i => i.pedido_id === pedido.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
        pedido.atualizado_em = new Date().toISOString();
        await this.supabaseUpdate('pedidos', pedido.id, { valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em } as unknown as Record<string, unknown>);
      }
      this.saveToLocalStorage(); this.notify();
    }
    return novo;
  }

  async updateItemPedido(id: string, updates: Partial<ItemPedido>) {
    const idx = this.itensPedido.findIndex(i => i.id === id);
    if (idx === -1) return;
    const updated = { ...this.itensPedido[idx], ...updates };
    const ok = await this.supabaseUpdate('itens_pedido', id, updated as unknown as Record<string, unknown>);
    if (ok) {
      this.itensPedido[idx] = updated;
      const pedido = this.pedidos.find(p => p.id === updated.pedido_id);
      if (pedido) {
        pedido.valor_total = this.itensPedido.filter(i => i.pedido_id === pedido.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
        pedido.atualizado_em = new Date().toISOString();
        await this.supabaseUpdate('pedidos', pedido.id, { valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em } as unknown as Record<string, unknown>);
      }
      this.saveToLocalStorage(); this.notify();
    }
  }

  async deleteItemPedido(id: string) {
    const item = this.itensPedido.find(i => i.id === id);
    const ok = await this.supabaseDelete('itens_pedido', id);
    if (ok) {
      this.itensPedido = this.itensPedido.filter(i => i.id !== id);
      if (item) {
        const pedido = this.pedidos.find(p => p.id === item.pedido_id);
        if (pedido) {
          pedido.valor_total = this.itensPedido.filter(i => i.pedido_id === pedido.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
          pedido.atualizado_em = new Date().toISOString();
          await this.supabaseUpdate('pedidos', pedido.id, { valor_total: pedido.valor_total, atualizado_em: pedido.atualizado_em } as unknown as Record<string, unknown>);
        }
      }
      this.saveToLocalStorage(); this.notify();
    }
  }

  async lancarSaidaPedido(pedidoId: string): Promise<{ success: boolean; error?: string }> {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    const itens = this.itensPedido.filter(i => i.pedido_id === pedidoId);

    for (const item of itens) {
      const prod = this.produtos.find(p => p.id === item.produto_id);
      const estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      const reservada = estoque?.quantidade_reservada || 0;
      if (reservada < item.quantidade_solicitada) {
        return {
          success: false,
          error: `Estoque insuficiente de "${prod?.nome || item.produto_id}". Reservado: ${reservada}${prod ? this.unidadeSigla(prod.unidade_producao_id) : ''}, necessário: ${item.quantidade_solicitada}. Produza mais antes de entregar.`
        };
      }
    }

    let ok = true;
    for (const item of itens) {
      const estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      if (estoque) {
        estoque.quantidade_reservada -= item.quantidade_solicitada;
        estoque.data_atualizacao = new Date().toISOString();
        if (!await this.supabaseUpdate('estoque_produtos', estoque.id, estoque as unknown as Record<string, unknown>)) ok = false;
      }
      const mov: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id, tipo_id: 5, quantidade: item.quantidade_solicitada,
        pedido_id: pedidoId, criado_em: new Date().toISOString()
      };
      if (!await this.supabaseInsert('movimentacoes_produtos', mov as unknown as Record<string, unknown>)) ok = false;
      if (ok) this.movProdutos.unshift(mov);
    }
    if (ok) { this.saveToLocalStorage(); this.notify(); }
    return { success: ok, error: ok ? undefined : 'Erro ao salvar no servidor' };
  }

  // ================================================
  // CRUD — PERFIS USUÁRIO
  // ================================================
  async listPerfisUsuarios() {
    const data = await this.fetchAll<PerfilUsuario>('perfis_usuario');
    this.perfisUsuarios = data; return data;
  }

  async updatePerfilUsuario(userId: string, updates: Partial<PerfilUsuario>) {
    const ok = await this.supabaseUpdate('perfis_usuario', userId, updates as unknown as Record<string, unknown>);
    if (ok) {
      const idx = this.perfisUsuarios.findIndex(u => u.id === userId);
      if (idx >= 0) this.perfisUsuarios[idx] = { ...this.perfisUsuarios[idx], ...updates };
      else this.perfisUsuarios.push({ id: userId, ...updates } as PerfilUsuario);
      this.saveToLocalStorage(); this.notify();
    }
  }

  // ================================================
  // CRUD — UNIDADES
  // ================================================
  async addUnidade(data: { sigla: string; nome: string; tipo: 'massa' | 'volume' | 'unidade' }) {
    if (!isSupabaseConfigured()) return null;
    const { data: inserted, error } = await supabase.from('unidades').insert(data).select().single();
    if (error || !inserted) { this.setError(error?.message || 'Erro ao criar unidade', 'server'); return null; }
    const u = inserted as Unidade;
    this.unidades.push(u);
    this.saveToLocalStorage(); this.notify();
    return u;
  }

  async updateUnidade(id: number, data: Partial<Unidade>) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('unidades').update(data).eq('id', id);
    if (!error) {
      const idx = this.unidades.findIndex(u => u.id === id);
      if (idx >= 0) this.unidades[idx] = { ...this.unidades[idx], ...data };
      this.saveToLocalStorage(); this.notify();
    }
  }

  async deleteUnidade(id: number): Promise<boolean> {
    // Verifica se há materiais usando esta unidade
    const emUso = this.materiais.some(m => m.unidade_id === id);
    if (emUso) {
      this.error = 'Não é possível excluir: existem ingredientes usando esta unidade.';
      this.errorType = null;
      this.notify();
      return false;
    }
    const ok = await this.supabaseDelete('unidades', String(id));
    if (ok) {
      this.unidades = this.unidades.filter(u => u.id !== id);
      this.saveToLocalStorage(); this.notify();
    }
    return ok;
  }

  // ================================================
  // FORNECEDORES
  // ================================================
  async addFornecedor(data: { nome_fantasia: string; contato?: string; telefone?: string; email?: string }) {
    if (!isSupabaseConfigured()) return null;
    const { data: inserted, error } = await supabase.from('fornecedores').insert(data).select().single();
    if (error || !inserted) { this.setError(error?.message || 'Erro ao criar fornecedor', 'server'); return null; }
    const f = inserted as Fornecedor;
    this.fornecedores.push(f);
    this.saveToLocalStorage(); this.notify();
    return f;
  }

  async updateFornecedor(id: number, data: Partial<Fornecedor>) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('fornecedores').update(data).eq('id', id);
    if (!error) {
      const idx = this.fornecedores.findIndex(f => f.id === id);
      if (idx >= 0) this.fornecedores[idx] = { ...this.fornecedores[idx], ...data };
      this.saveToLocalStorage(); this.notify();
    }
  }

  async toggleFornecedorAtivo(id: number) {
    const f = this.fornecedores.find(f => f.id === id);
    if (!f || !isSupabaseConfigured()) return;
    const novoAtivo = !f.ativo;
    const { error } = await supabase.from('fornecedores').update({ ativo: novoAtivo }).eq('id', id);
    if (!error) {
      f.ativo = novoAtivo;
      this.saveToLocalStorage(); this.notify();
    }
  }

  async deleteFornecedor(id: number): Promise<boolean> {
    const ok = await this.supabaseDelete('fornecedores', String(id));
    if (ok) {
      this.fornecedores = this.fornecedores.filter(f => f.id !== id);
      this.saveToLocalStorage(); this.notify();
    }
    return ok;
  }

  // ================================================
  // FINANCEIRO
  // ================================================
  async addLancamentoFinanceiro(data: Omit<LancamentoFinanceiro, 'id' | 'criado_em'>) {
    const novo = { ...data, id: crypto.randomUUID(), criado_em: new Date().toISOString() };
    const ok = await this.supabaseInsert('lancamentos_financeiros', novo as unknown as Record<string, unknown>);
    if (ok) { this.lancamentos.unshift(novo); this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async deleteLancamentoFinanceiro(id: string) {
    const ok = await this.supabaseDelete('lancamentos_financeiros', id);
    if (ok) { this.lancamentos = this.lancamentos.filter(l => l.id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  async carregarDadosEmpresa(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const { data, error } = await supabase
      .from('configuracao_sistema')
      .select('*')
      .eq('id', 1)
      .single();
    if (!error && data) {
      this.dadosEmpresa = {
        nome_empresa: data.nome_empresa || '',
        cnpj: data.cnpj || '',
        inscricao_municipal: data.inscricao_municipal || '',
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        uf: data.uf || '',
        cep: data.cep || '',
        telefone: data.telefone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        slogan: data.slogan || '',
      };
      this.saveToLocalStorage();
      this.notify();
    }
  }

  async salvarDadosEmpresa(dados: DadosEmpresa): Promise<boolean> {
    this.dadosEmpresa = dados;
    if (!isSupabaseConfigured()) { this.saveToLocalStorage(); this.notify(); return false; }
    const { error } = await supabase
      .from('configuracao_sistema')
      .update({
        nome_empresa: dados.nome_empresa,
        cnpj: dados.cnpj,
        inscricao_municipal: dados.inscricao_municipal,
        logradouro: dados.logradouro,
        numero: dados.numero,
        bairro: dados.bairro,
        cidade: dados.cidade,
        uf: dados.uf,
        cep: dados.cep,
        telefone: dados.telefone,
        email: dados.email,
        logo_url: dados.logo_url,
        slogan: dados.slogan,
      })
      .eq('id', 1);
    if (error) { this.setError(error.message + ' — Contate o supervisor.', 'server'); return false; }
    localStorage.setItem('appName', dados.nome_empresa);
    this.notify();
    return true;
  }

  async registrarPagamentoPedido(pedidoId: string, valor: number, formaPagamento?: string, dataLancamento?: string) {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return null;
    const cliente = this.clientes.find(c => c.id === pedido.cliente_id);
    const catVenda = this.categoriasFinanceiro.find(c => c.tipo === 'receita');
    return await this.addLancamentoFinanceiro({
      data_lancamento: dataLancamento || new Date().toISOString().split('T')[0],
      valor,
      tipo: 'receita',
      categoria_id: catVenda?.id || 1,
      descricao: `Pagamento pedido #${pedidoId.slice(-6)} - ${cliente?.nome || 'Cliente'}`,
      pedido_id: pedidoId,
      forma_pagamento: formaPagamento,
    });
  }

  async estornarPagamentosPedido(pedidoId: string): Promise<{ success: boolean; error?: string }> {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    const catEstornoId = this.getCategoriaEstornoId();
    if (!catEstornoId) return { success: false, error: 'Categoria Estorno não configurada' };
    const receitas = this.lancamentos.filter(l => l.pedido_id === pedidoId && l.tipo === 'receita');
    if (receitas.length === 0) return { success: false, error: 'Nenhum pagamento para estornar' };

    for (const rec of receitas) {
      const jaEstornado = this.lancamentos.some(l =>
        l.pedido_id === pedidoId &&
        l.tipo === 'despesa' &&
        l.valor === rec.valor &&
        l.forma_pagamento === rec.forma_pagamento
      );
      if (jaEstornado) continue;

      const estorno = {
        id: crypto.randomUUID(),
        data_lancamento: new Date().toISOString().split('T')[0],
        valor: rec.valor,
        tipo: 'despesa' as const,
        categoria_id: catEstornoId,
        descricao: `Estorno pedido #${pedidoId.slice(-6)} - ${rec.forma_pagamento || 'pagamento'}`,
        pedido_id: pedidoId,
        forma_pagamento: rec.forma_pagamento,
        criado_em: new Date().toISOString(),
      };
      const ok = await this.supabaseInsert('lancamentos_financeiros', estorno as unknown as Record<string, unknown>);
      if (ok) this.lancamentos.unshift(estorno);
    }
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  // ================================================
  // PLANEJAMENTO DE COMPRAS
  // ================================================
  async gerarSugestoesCompra() {
    return await this.fetchAll<PlanejamentoCompra>('planejamento_compras', 'data_sugerida ASC');
  }
}
