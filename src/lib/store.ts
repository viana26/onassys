import { Material, Produto, FichaTecnicaItem, EstoqueProduto, Cliente, Pedido, ItemPedido, MovimentacaoMaterial, MovimentacaoProduto, Unidade, Categoria, StatusPedido, TipoMovimentacao, TipoCliente, Fornecedor, Permissao, Perfil, CategoriaFinanceiro, LancamentoFinanceiro, PlanejamentoCompra, PerfilUsuario, PerfilPermissao, DadosEmpresa } from '../types';
import { calcularCustoProducao, normalizarQuantidade } from './calculos';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { deleteProdutoImage, isStorageUrl } from './imageUpload';

export const dataLocal = (d?: Date) => {
  const dt = d || new Date();
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

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
  unidadeSigla(id: number): string { if (!id) return ''; return this.unidades.find(u => u.id === id)?.sigla || ''; }
  unidadeNome(id: number): string { if (!id) return ''; return this.unidades.find(u => u.id === id)?.nome || ''; }
  categoriaNome(id: number): string { if (!id) return ''; return this.categorias.find(c => c.id === id)?.nome || ''; }
  statusNome(id: number): string { return this.statusPedido.find(s => s.id === id)?.nome || `?(${id})`; }
  tipoClienteNome(id: number): string { return this.tiposCliente.find(t => t.id === id)?.nome || `?(${id})`; }
  fornecedorNome(id: number): string { return this.fornecedores.find(f => f.id === id)?.nome_fantasia || `?(${id})`; }
  perfilNome(id: number): string { return this.perfis.find(p => p.id === id)?.nome || `?(${id})`; }
  tipoMovNome(id: number): string { return this.tiposMovimentacao.find(t => t.id === id)?.nome || `?(${id})`; }
  categoriaFinanceiroNome(id: number): string { return this.categoriasFinanceiro.find(c => c.id === id)?.nome || `?(${id})`; }
  private getCategoriaEstornoId(): number {
    return this.categoriasFinanceiro.find(c => c.nome === 'Estorno')?.id || 0;
  }
  private getTipoVendaDiretaId(): number {
    return this.tiposMovimentacao.find(t => t.nome === 'Venda Direta')?.id || 6;
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
    const { data: existing, error: selectError } = await supabase
      .from('perfis_usuario')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      this.currentUserId = userId;
      if (!this.perfisUsuarios.some(u => u.id === userId)) {
        this.perfisUsuarios.push(existing as PerfilUsuario);
      }
      this.saveToLocalStorage();
      if (!this.loading) this.setCurrentUser(userId);
      return;
    }

    let finalPerfilId = perfilId;
    if (finalPerfilId === undefined) {
      const { count } = await supabase
        .from('perfis_usuario')
        .select('*', { count: 'exact', head: true });
      const totalPerfis = count !== null ? count : this.perfisUsuarios.length;
      finalPerfilId = totalPerfis === 0 ? 1 : 3;
    }

    const { error } = await supabase.from('perfis_usuario').insert({
      id: userId,
      nome,
      perfil_id: finalPerfilId,
      ativo: true,
    });
    if (!error) {
      const newProfile = {
        id: userId,
        nome,
        perfil_id: finalPerfilId,
        ativo: true,
      };
      if (!this.perfisUsuarios.some(u => u.id === userId)) {
        this.perfisUsuarios.push(newProfile);
      }
      this.saveToLocalStorage();
    } else {
      console.error('Erro ao inserir perfil_usuario no Supabase:', error);
    }
    this.currentUserId = userId;
    if (!this.loading) this.setCurrentUser(userId);
  }

  // ================================================
  // PERSISTÊNCIA LOCAL (cache)
  // ================================================
  private saveToLocalStorage() {
    // no-op: Supabase é a fonte de verdade
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
    this.saveToLocalStorage(); // CACHE_ONLY
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
    this.saveToLocalStorage(); // CACHE_ONLY
    if (this.currentUserId) this.setCurrentUser(this.currentUserId);
    this.notify();
  }

  private recalcularValoresPedidos() {
    this.pedidos = this.pedidos.map(pedido => {
      const total = this.itensPedido
        .filter(i => i.pedido_id === pedido.id)
        .reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
      if (pedido.valor_total !== total) {
        this.supabaseUpdate('pedidos', pedido.id, { valor_total: total } as unknown as Record<string, unknown>);
        return { ...pedido, valor_total: total };
      }
      return pedido;
    });
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
    if (ok) { this.materiais = [...this.materiais, novo]; this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateMaterial(id: string, updates: Partial<Material>) {
    const idx = this.materiais.findIndex(m => m.id === id);
    if (idx === -1) return;
    const updated = { ...this.materiais[idx], ...updates, data_ultima_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseUpdate('materiais', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.materiais = this.materiais.map((m, i) => i === idx ? updated : m); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteMaterial(id: string) {
    const ok = await this.supabaseDelete('materiais', id);
    if (ok) {
      this.materiais = this.materiais.filter(m => m.id !== id);
      this.fichas = this.fichas.filter(f => f.material_id !== id);
      this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify();
    }
  }

  async lancarEntradaMaterial(id: string, quantidade: number, custoUnitario?: number, observacao?: string, criarDespesa?: boolean, formaPagamento?: string) {
    const mat = this.materiais.find(m => m.id === id);
    if (!mat) return;

    const unitPrice = custoUnitario !== undefined && custoUnitario >= 0 ? custoUnitario : mat.custo_unitario;
    const tipoEntradaCompra = this.tiposMovimentacao.find(t => t.nome === 'Entrada Compra');
    const tipoId = tipoEntradaCompra ? tipoEntradaCompra.id : 1;

    const mov: MovimentacaoMaterial = {
      id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
      material_id: id,
      tipo_id: tipoId,
      quantidade,
      observacao: observacao?.trim() ? `Entrada Compra — ${observacao.trim()}` : 'Entrada Compra',
      valor_pago: unitPrice * quantidade,
      custo_unitario: unitPrice,
      criado_em: new Date().toISOString()
    };

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
      this.movMateriais = [mov, ...this.movMateriais];
      if (criarDespesa) {
        const catDespesa = this.categoriasFinanceiro.find(c => c.nome === 'Matéria-Prima' || c.tipo === 'despesa');
        const baseDesc = `Compra: ${mat.nome}${observacao?.trim() ? ` | ${observacao.trim()}` : ''}`;
        const despesa: LancamentoFinanceiro = {
          id: crypto.randomUUID(), criado_em: new Date().toISOString(),
          data_lancamento: dataLocal(),
          valor: unitPrice * quantidade, tipo: 'despesa',
          categoria_id: catDespesa?.id || 1,
          descricao: baseDesc,
          forma_pagamento: formaPagamento || undefined,
          movimentacao_id: mov.id,
        };
        await this.supabaseInsert('lancamentos_financeiros', despesa as unknown as Record<string, unknown>);
        this.lancamentos = [despesa, ...this.lancamentos];
      }
      this.saveToLocalStorage(); this.notify();
    }
  }

  async ajustarEstoqueMaterial(materialId: string, novoSaldo: number, observacao?: string, quantidadeMinima?: number): Promise<{ success: boolean; error?: string }> {
    const idx = this.materiais.findIndex(m => m.id === materialId);
    if (idx === -1) return { success: false, error: 'Insumo não encontrado.' };
    const antigo = this.materiais[idx].quantidade_atual;
    const antigoMinimo = this.materiais[idx].quantidade_minima;
    const mudouSaldo = novoSaldo !== antigo;
    const mudouMinimo = quantidadeMinima !== undefined && quantidadeMinima !== antigoMinimo;
    if (!mudouSaldo && !mudouMinimo) return { success: true };

    const atualizado = {
      ...this.materiais[idx],
      quantidade_atual: novoSaldo,
      quantidade_minima: mudouMinimo ? quantidadeMinima! : antigoMinimo,
      data_ultima_atualizacao: new Date().toISOString()
    };

    const okMat = await this.supabaseUpdate('materiais', materialId, atualizado as unknown as Record<string, unknown>);
    if (!okMat) return { success: false, error: this.error || 'Erro ao atualizar estoque no servidor.' };

    if (mudouSaldo) {
      const delta = novoSaldo - antigo;
      let tipoId = 3;
      let qtdMov = delta;
      if (delta < 0) {
        const tipoSaida = this.tiposMovimentacao.find(t => t.nome === 'Ajuste Estoque (Saída)' || t.nome === 'Ajuste Saída');
        if (tipoSaida) tipoId = tipoSaida.id;
        qtdMov = Math.abs(delta);
      } else {
        const tipoEntrada = this.tiposMovimentacao.find(t => t.nome === 'Ajuste Estoque' || t.nome === 'Ajuste Entrada' || t.nome === 'Ajuste Estoque (Entrada)');
        if (tipoEntrada) tipoId = tipoEntrada.id;
      }

      let obsTexto = `Ajuste no saldo de: ${antigo} → ${novoSaldo}`;
      if (observacao) obsTexto += ` | ${observacao}`;

      const custoUnit = this.materiais[idx].custo_unitario;
      const mov: MovimentacaoMaterial = {
        id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
        material_id: materialId,
        tipo_id: tipoId,
        quantidade: qtdMov,
        custo_unitario: custoUnit,
        valor_pago: custoUnit * qtdMov,
        observacao: obsTexto,
        criado_em: new Date().toISOString()
      };

      const okMov = await this.supabaseInsert('movimentacoes_materiais', mov as unknown as Record<string, unknown>);
      if (!okMov) {
        const revertido = { ...atualizado, quantidade_atual: antigo };
        await this.supabaseUpdate('materiais', materialId, revertido as unknown as Record<string, unknown>);
        return { success: false, error: this.error || 'Erro ao registrar movimentação. Estoque não foi alterado.' };
      }
      this.movMateriais = [mov, ...this.movMateriais];
    }

    this.materiais = this.materiais.map((m, i) => i === idx ? atualizado : m);
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
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
    if (ok) { this.produtos = [...this.produtos, novo]; this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateProduto(id: string, updates: Partial<Produto>) {
    const idx = this.produtos.findIndex(p => p.id === id);
    if (idx === -1) return;
    const updated = { ...this.produtos[idx], ...updates };
    const ok = await this.supabaseUpdate('produtos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.produtos = this.produtos.map((p, i) => i === idx ? updated : p); this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteProduto(id: string) {
    const p = this.produtos.find(x => x.id === id);
    const ok = await this.supabaseDelete('produtos', id);
    if (ok) {
      if (p?.imagem && isStorageUrl(p.imagem)) deleteProdutoImage(p.imagem).catch(() => { });
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
    if (ok) { this.fichas = [...this.fichas, nova]; this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
    return nova;
  }

  async updateFichaTecnica(id: string, updates: Partial<FichaTecnicaItem>) {
    const idx = this.fichas.findIndex(f => f.id === id);
    if (idx === -1) return;
    const updated = { ...this.fichas[idx], ...updates };
    const ok = await this.supabaseUpdate('fichas_tecnicas', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.fichas = this.fichas.map((f, i) => i === idx ? updated : f); this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteFichaTecnica(id: string): Promise<boolean> {
    const ok = await this.supabaseDelete('fichas_tecnicas', id);
    if (ok) { this.fichas = this.fichas.filter(f => f.id !== id); this.recalcularCustosProdutos(); this.saveToLocalStorage(); this.notify(); }
    return ok;
  }

  // ================================================
  // CRUD — ESTOQUE PRODUTOS
  // ================================================
  async addEstoqueProduto(estoque: Omit<EstoqueProduto, 'id' | 'data_atualizacao'>) {
    const novo: EstoqueProduto = { ...estoque, id: 'est_' + Math.random().toString(36).substring(2, 9), data_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseInsert('estoque_produtos', novo as unknown as Record<string, unknown>);
    if (ok) { this.estoqueProdutos = [...this.estoqueProdutos, novo]; this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateEstoqueProduto(id: string, updates: Partial<EstoqueProduto>) {
    const idx = this.estoqueProdutos.findIndex(e => e.id === id);
    if (idx === -1) return;
    const updated = { ...this.estoqueProdutos[idx], ...updates, data_atualizacao: new Date().toISOString() };
    const ok = await this.supabaseUpdate('estoque_produtos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? { ...e, ...updates, data_atualizacao: new Date().toISOString() } : e); this.saveToLocalStorage(); this.notify(); }
  }

  async updateEstoqueProdutoConfig(id: string, updates: Partial<EstoqueProduto>) { return this.updateEstoqueProduto(id, updates); }

  async ajustarEstoqueProduto(estoqueId: string, novoDisponivel: number, observacao?: string, quantidadeMinima?: number): Promise<{ success: boolean; error?: string }> {
    const idx = this.estoqueProdutos.findIndex(e => e.id === estoqueId);
    if (idx === -1) return { success: false, error: 'Registro de estoque não encontrado.' };
    const antigo = this.estoqueProdutos[idx].quantidade_disponivel;
    const antigoMinimo = this.estoqueProdutos[idx].quantidade_minima;
    const mudouSaldo = novoDisponivel !== antigo;
    const mudouMinimo = quantidadeMinima !== undefined && quantidadeMinima !== antigoMinimo;
    if (!mudouSaldo && !mudouMinimo) return { success: true };

    const atualizado = {
      ...this.estoqueProdutos[idx],
      quantidade_disponivel: novoDisponivel,
      quantidade_minima: mudouMinimo ? quantidadeMinima! : antigoMinimo,
      data_atualizacao: new Date().toISOString()
    };

    const ok = await this.supabaseUpdate('estoque_produtos', estoqueId, atualizado as unknown as Record<string, unknown>);
    if (!ok) return { success: false, error: this.error || 'Erro ao atualizar estoque no servidor.' };

    if (mudouSaldo) {
      const delta = novoDisponivel - antigo;
      let tipoId = 3;
      let qtdMov = delta;
      if (delta < 0) {
        const tipoSaida = this.tiposMovimentacao.find(t => t.nome === 'Ajuste Estoque (Saída)' || t.nome === 'Ajuste Saída');
        if (tipoSaida) tipoId = tipoSaida.id;
        qtdMov = Math.abs(delta);
      } else {
        const tipoEntrada = this.tiposMovimentacao.find(t => t.nome === 'Ajuste Estoque' || t.nome === 'Ajuste Entrada' || t.nome === 'Ajuste Estoque (Entrada)');
        if (tipoEntrada) tipoId = tipoEntrada.id;
      }

      let obsTexto = `Ajuste no saldo de: ${antigo} → ${novoDisponivel}`;
      if (observacao) obsTexto += ` | ${observacao}`;

      const mov: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: this.estoqueProdutos[idx].produto_id,
        tipo_id: tipoId,
        quantidade: qtdMov,
        observacao: obsTexto,
        usuario_id: this.currentUserId ?? undefined,
        criado_em: new Date().toISOString()
      };

      const okMov = await this.supabaseInsert('movimentacoes_produtos', mov as unknown as Record<string, unknown>);
      if (!okMov) {
        const revertido = { ...atualizado, quantidade_disponivel: antigo };
        await this.supabaseUpdate('estoque_produtos', estoqueId, revertido as unknown as Record<string, unknown>);
        return { success: false, error: this.error || 'Erro ao registrar movimentação. Estoque não foi alterado.' };
      }
      this.movProdutos = [mov, ...this.movProdutos];
    }

    this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? atualizado : e);
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  async deleteEstoqueProduto(id: string) {
    const ok = await this.supabaseDelete('estoque_produtos', id);
    if (ok) { this.estoqueProdutos = this.estoqueProdutos.filter(e => e.id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  async lancarLoteProducao(produtoId: string, quantidade: number, observacao?: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.lancarProducao([{ produto_id: produtoId, quantidade_solicitada: quantidade }], undefined, observacao);
    if (!result.success) return result;

    const idx = this.estoqueProdutos.findIndex(e => e.produto_id === produtoId);
    if (idx !== -1) {
      const atualizado = {
        ...this.estoqueProdutos[idx],
        data_atualizacao: new Date().toISOString()
      };
      const ok = await this.supabaseUpdate('estoque_produtos', atualizado.id, atualizado as unknown as Record<string, unknown>);
      if (ok) {
        this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? atualizado : e);
        this.saveToLocalStorage(); this.notify();
      } else {
        return { success: false, error: 'Erro ao salvar no servidor.' };
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
    if (ok) { this.clientes = [...this.clientes, novo]; this.saveToLocalStorage(); this.notify(); }
    return novo;
  }

  async updateCliente(id: string, updates: Partial<Cliente>) {
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx === -1) return;
    const updated = { ...this.clientes[idx], ...updates };
    const ok = await this.supabaseUpdate('clientes', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.clientes = this.clientes.map((c, i) => i === idx ? updated : c); this.saveToLocalStorage(); this.notify(); }
  }

  async deleteCliente(id: string) {
    const ok = await this.supabaseDelete('clientes', id);
    if (ok) { this.clientes = this.clientes.filter(c => c.id !== id); this.saveToLocalStorage(); this.notify(); }
  }

  // ================================================
  // CRUD — PEDIDOS
  // ================================================
  async addPedido(data: Partial<Pedido>): Promise<Pedido | null> {
    const novo: Pedido = {
      cliente_id: data.cliente_id || '',
      status_id: data.status_id || 1,
      data_entrega_prevista: data.data_entrega_prevista || new Date().toISOString(),
      observacoes: data.observacoes, criado_by: data.criado_by || '', valor_total: data.valor_total ?? 0,
      desconto_valor: data.desconto_valor ?? 0,
      categoria_receita_id: data.categoria_receita_id,
      id: 'ped_' + Math.random().toString(36).substring(2, 9),
      data_pedido: new Date().toISOString(), atualizado_em: new Date().toISOString()
    };
    const ok = await this.supabaseInsert('pedidos', novo as unknown as Record<string, unknown>);
    if (ok) { this.pedidos.push(novo); this.saveToLocalStorage(); this.notify(); return novo; }
    return null;
  }

  async updatePedido(id: string, updates: Partial<Pedido>): Promise<boolean> {
    const idx = this.pedidos.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const updated = { ...this.pedidos[idx], ...updates, atualizado_em: new Date().toISOString() };
    const ok = await this.supabaseUpdate('pedidos', id, updated as unknown as Record<string, unknown>);
    if (ok) { this.pedidos = this.pedidos.map((p, i) => i === idx ? updated : p); this.saveToLocalStorage(); this.notify(); }
    return ok;
  }

  async updatePedidoStatus(id: string, status_id: number): Promise<{ success: boolean; error?: string }> {
    this.error = null;
    this.errorType = null;
    const pedido = this.pedidos.find(p => p.id === id);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    const fromStatus = pedido.status_id;
    if (fromStatus === status_id) return { success: true };

    // 3 → 4: finalizar produção — consumir insumos + gerar estoque
    if (fromStatus === 3 && status_id === 4) {
      const itens = this.itensPedido.filter(i => i.pedido_id === id);
      const result = await this.lancarProducao(itens, id);
      if (!result.success) return result;
    }

    // 4 → 5: entregar — baixar estoque de produtos
    if (fromStatus === 4 && status_id === 5) {
      const result = await this.lancarSaidaPedido(id);
      if (!result.success) return result;
    }

    const ok = await this.updatePedido(id, { status_id });
    if (!ok) return { success: false, error: 'Erro ao atualizar status no servidor' };
    return { success: true };
  }

  async atenderPedidoDoEstoque(pedidoId: string): Promise<{ success: boolean; error?: string }> {
    this.error = null;
    this.errorType = null;
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    if (pedido.status_id !== 2) return { success: false, error: 'Pedido precisa estar Confirmado' };
    const result = await this.lancarSaidaPedido(pedidoId);
    if (!result.success) return result;
    const statusOk = await this.updatePedido(pedidoId, { status_id: 5 });
    if (!statusOk) return { success: false, error: 'Erro ao atualizar status no servidor' };
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  async lancarProducao(itens: Array<{ produto_id: string; quantidade_solicitada: number }>, pedidoId?: string, observacao?: string): Promise<{ success: boolean; error?: string }> {
    const materiaisUsados: Record<string, { material: Material; ficha: FichaTecnicaItem; qtdNeeded: number }[]> = {};

    const itensInsuficientes: string[] = [];

    for (const item of itens) {
      const fichas = this.fichas.filter(f => f.produto_id === item.produto_id);
      const produto = this.produtos.find(p => p.id === item.produto_id);
      if (!produto) return { success: false, error: `Produto não encontrado: ${item.produto_id}` };
      if (fichas.length === 0) {
        const idsFichas = this.fichas.map(f => f.produto_id);
        return { success: false, error: `Ficha técnica não encontrada para "${produto.nome}".\n\nFichas carregadas: ${this.fichas.length}\nID do produto: ${item.produto_id}\nIDs das fichas existentes: [${idsFichas.join(', ')}]` };
      }

      for (const ficha of fichas) {
        const mat = this.materiais.find(m => m.id === ficha.material_id);
        if (!mat) return { success: false, error: `Ingrediente não encontrado na ficha de "${produto.nome}"` };

        const qtdNeeded = normalizarQuantidade(
          ficha.quantidade_necessaria * item.quantidade_solicitada,
          ficha.unidade_id, mat.unidade_id, this.unidades
        );

        if (mat.quantidade_atual < qtdNeeded) {
          const falta = qtdNeeded - mat.quantidade_atual;
          itensInsuficientes.push(`${mat.nome}: falta ${falta.toFixed(2)}${this.unidadeSigla(mat.unidade_id)}`);
        } else {
          if (!materiaisUsados[mat.id]) materiaisUsados[mat.id] = [];
          materiaisUsados[mat.id].push({ material: mat, ficha, qtdNeeded });
        }
      }
    }

    if (itensInsuficientes.length > 0) {
      return { success: false, error: itensInsuficientes.join('\n') };
    }

    // Consumir insumos (paralelo)
    const matPromises: Promise<boolean>[] = [];
    const movsMatCriadas: MovimentacaoMaterial[] = [];
    const updatesMatLocal: { idx: number; dados: Material }[] = [];

    for (const matId of Object.keys(materiaisUsados)) {
      const totalQtd = Number(materiaisUsados[matId].reduce((s, e) => s + e.qtdNeeded, 0).toFixed(3));
      const mat = this.materiais.find(m => m.id === matId)!;
      const dadosMat = {
        ...mat,
        quantidade_atual: Number((mat.quantidade_atual - totalQtd).toFixed(3)),
        data_ultima_atualizacao: new Date().toISOString(),
      };
      updatesMatLocal.push({ idx: this.materiais.indexOf(mat), dados: dadosMat });
      matPromises.push(this.supabaseUpdate('materiais', matId, dadosMat as unknown as Record<string, unknown>));

      const tipoSaidaProducao = this.tiposMovimentacao.find(t => t.nome === 'Saída Produção');
      const tipoIdMat = tipoSaidaProducao ? tipoSaidaProducao.id : 2;

      const mov: MovimentacaoMaterial = {
        id: 'mov_m_' + Math.random().toString(36).substring(2, 9),
        material_id: matId, tipo_id: tipoIdMat, quantidade: totalQtd,
        observacao: pedidoId ? `Consumo por produção — Pedido #${pedidoId.slice(-6).toUpperCase()}` : 'Produção avulsa',
        criado_em: new Date().toISOString()
      };
      movsMatCriadas.push(mov);
      matPromises.push(this.supabaseInsert('movimentacoes_materiais', mov as unknown as Record<string, unknown>));
    }
    if (matPromises.length > 0) {
      const matResults = await Promise.all(matPromises);
      if (matResults.some(r => !r)) return { success: false, error: 'Erro ao consumir insumos no servidor.' };
      for (const { idx, dados } of updatesMatLocal) {
        if (idx !== -1) this.materiais = this.materiais.map((m, i) => i === idx ? dados : m);
      }
      this.movMateriais = [...movsMatCriadas, ...this.movMateriais];
    }

    // Gerar produtos + movimentações (paralelo)
    const prodPromises: Promise<boolean>[] = [];
    const movsProdCriadas: MovimentacaoProduto[] = [];
    const updatesEstoqueLocal: { idx: number; dados: EstoqueProduto }[] = [];
    const novosEstoqueLocal: EstoqueProduto[] = [];

    for (const item of itens) {
      const produto = this.produtos.find(p => p.id === item.produto_id)!;
      let estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);

      if (estoque) {
        const updatedEstoque = {
          ...estoque,
          quantidade_disponivel: estoque.quantidade_disponivel + item.quantidade_solicitada,
          data_atualizacao: new Date().toISOString()
        };
        updatesEstoqueLocal.push({ idx: this.estoqueProdutos.indexOf(estoque), dados: updatedEstoque });
        prodPromises.push(this.supabaseUpdate('estoque_produtos', updatedEstoque.id, updatedEstoque as unknown as Record<string, unknown>));
      } else {
        const novoEstoque = {
          id: 'est_' + Math.random().toString(36).substring(2, 9),
          produto_id: item.produto_id, quantidade_disponivel: item.quantidade_solicitada,
          quantidade_minima: 0, data_atualizacao: new Date().toISOString()
        };
        novosEstoqueLocal.push(novoEstoque);
        prodPromises.push(this.supabaseInsert('estoque_produtos', novoEstoque as unknown as Record<string, unknown>));
      }

      const tipoEntradaProducao = this.tiposMovimentacao.find(t => t.nome === 'Entrada Produção');
      const tipoIdProd = tipoEntradaProducao ? tipoEntradaProducao.id : 5;

      const movProd: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id, tipo_id: tipoIdProd, quantidade: item.quantidade_solicitada,
        pedido_id: pedidoId, observacao: observacao ? `Entrada por produção — ${observacao}` : (pedidoId ? `Entrada por produção — Pedido #${pedidoId.slice(-6).toUpperCase()}` : 'Entrada por produção'),
        usuario_id: this.currentUserId ?? undefined,
        criado_em: new Date().toISOString()
      };
      movsProdCriadas.push(movProd);
      prodPromises.push(this.supabaseInsert('movimentacoes_produtos', movProd as unknown as Record<string, unknown>));
    }
    if (prodPromises.length > 0) {
      const prodResults = await Promise.all(prodPromises);
      if (prodResults.some(r => !r)) return { success: false, error: 'Erro ao gerar estoque no servidor.' };
      for (const { idx, dados } of updatesEstoqueLocal) {
        if (idx !== -1) this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? dados : e);
      }
      this.estoqueProdutos = [...novosEstoqueLocal, ...this.estoqueProdutos];
      this.movProdutos = [...movsProdCriadas, ...this.movProdutos];
    }

    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  async deletePedido(id: string): Promise<{ success: boolean; error?: string }> {
    const revResult = await this.reverterMovimentacoesPedido(id, { restaurarInsumos: true, removerProdutos: true, reporEstoque: true });
    if (!revResult.success) return revResult;

    let ok = false;
    try { ok = await this.supabaseDelete('pedidos', id); } catch { ok = false; }
    if (!ok) return { success: false, error: 'Erro ao excluir pedido no servidor' };

    this.pedidos = this.pedidos.filter(p => p.id !== id);
    this.itensPedido = this.itensPedido.filter(i => i.pedido_id !== id);
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  // ================================================
  // CRUD — ITENS PEDIDO
  // ================================================
  async addItemPedido(item: Omit<ItemPedido, 'id'>): Promise<ItemPedido | null> {
    const novo: ItemPedido = { ...item, id: 'item_' + Math.random().toString(36).substring(2, 9) };
    const ok = await this.supabaseInsert('itens_pedido', novo as unknown as Record<string, unknown>);
    if (ok) {
      this.itensPedido = [...this.itensPedido, novo];
      this.pedidos = this.pedidos.map(p => p.id === item.pedido_id ? {
        ...p,
        valor_total: (() => {
          const subtotal = this.itensPedido.filter(i => i.pedido_id === p.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
          return Math.max(0, subtotal - (p.desconto_valor ?? 0));
        })(),
        atualizado_em: new Date().toISOString()
      } : p);
      const pedidoAtualizado = this.pedidos.find(p => p.id === item.pedido_id);
      if (pedidoAtualizado) {
        await this.supabaseUpdate('pedidos', pedidoAtualizado.id, { valor_total: pedidoAtualizado.valor_total, atualizado_em: pedidoAtualizado.atualizado_em } as unknown as Record<string, unknown>);
      }
      this.saveToLocalStorage(); this.notify();
      return novo;
    }
    return null;
  }

  async updateItemPedido(id: string, updates: Partial<ItemPedido>) {
    const idx = this.itensPedido.findIndex(i => i.id === id);
    if (idx === -1) return;
    const updated = { ...this.itensPedido[idx], ...updates };
    const ok = await this.supabaseUpdate('itens_pedido', id, updated as unknown as Record<string, unknown>);
    if (ok) {
      this.itensPedido = this.itensPedido.map((it, i) => i === idx ? updated : it);
      this.pedidos = this.pedidos.map(p => p.id === updated.pedido_id ? {
        ...p,
        valor_total: (() => {
          const subtotal = this.itensPedido.filter(i => i.pedido_id === p.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
          return Math.max(0, subtotal - (p.desconto_valor ?? 0));
        })(),
        atualizado_em: new Date().toISOString()
      } : p);
      const pedidoAtualizado = this.pedidos.find(p => p.id === updated.pedido_id);
      if (pedidoAtualizado) {
        await this.supabaseUpdate('pedidos', pedidoAtualizado.id, { valor_total: pedidoAtualizado.valor_total, atualizado_em: pedidoAtualizado.atualizado_em } as unknown as Record<string, unknown>);
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
        this.pedidos = this.pedidos.map(p => p.id === item.pedido_id ? {
          ...p,
          valor_total: (() => {
            const subtotal = this.itensPedido.filter(i => i.pedido_id === p.id).reduce((s, i) => s + (i.quantidade_solicitada * i.preco_unitario), 0);
            return Math.max(0, subtotal - (p.desconto_valor ?? 0));
          })(),
          atualizado_em: new Date().toISOString()
        } : p);
        const pedidoAtualizado = this.pedidos.find(p => p.id === item.pedido_id);
        if (pedidoAtualizado) {
          await this.supabaseUpdate('pedidos', pedidoAtualizado.id, { valor_total: pedidoAtualizado.valor_total, atualizado_em: pedidoAtualizado.atualizado_em } as unknown as Record<string, unknown>);
        }
      }
      this.saveToLocalStorage(); this.notify();
    }
  }

  async lancarSaidaPedido(pedidoId: string): Promise<{ success: boolean; error?: string; insufficientItems?: Array<{ produtoId: string; produtoNome: string; disponivel: number; necessario: number; unidade: string }> }> {
    const pedido = this.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return { success: false, error: 'Pedido não encontrado' };
    const itens = this.itensPedido.filter(i => i.pedido_id === pedidoId);

    const insufficientItems: Array<{ produtoId: string; produtoNome: string; disponivel: number; necessario: number; unidade: string }> = [];
    for (const item of itens) {
      const prod = this.produtos.find(p => p.id === item.produto_id);
      const estoque = this.estoqueProdutos.find(e => e.produto_id === item.produto_id);
      const disponivel = estoque?.quantidade_disponivel || 0;
      if (disponivel < item.quantidade_solicitada) {
        insufficientItems.push({
          produtoId: item.produto_id,
          produtoNome: prod?.nome || item.produto_id,
          disponivel,
          necessario: item.quantidade_solicitada,
          unidade: prod ? this.unidadeSigla(prod.unidade_producao_id) : ''
        });
      }
    }
    if (insufficientItems.length > 0) {
      return {
        success: false,
        error: 'Estoque insuficiente para um ou mais itens.',
        insufficientItems
      };
    }

    const saidaPromises: Promise<boolean>[] = [];
    const movsSaidaCriadas: MovimentacaoProduto[] = [];
    const updatesEstoqueSaida: { idx: number; dados: EstoqueProduto }[] = [];

    for (const item of itens) {
      const idx = this.estoqueProdutos.findIndex(e => e.produto_id === item.produto_id);
      if (idx >= 0) {
        const original = this.estoqueProdutos[idx];
        const updated = { ...original, quantidade_disponivel: original.quantidade_disponivel - item.quantidade_solicitada, data_atualizacao: new Date().toISOString() };
        updatesEstoqueSaida.push({ idx, dados: updated });
        saidaPromises.push(this.supabaseUpdate('estoque_produtos', updated.id, updated as unknown as Record<string, unknown>));
      }
      const tipoSaidaPedido = this.tiposMovimentacao.find(t => t.nome === 'Saída Pedido');
      const tipoIdSaida = tipoSaidaPedido ? tipoSaidaPedido.id : 6;

      const mov: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produto_id, tipo_id: tipoIdSaida, quantidade: item.quantidade_solicitada,
        pedido_id: pedidoId, observacao: `Saída por entrega — Pedido #${pedidoId.slice(-6).toUpperCase()}`,
        usuario_id: this.currentUserId ?? undefined,
        criado_em: new Date().toISOString()
      };
      movsSaidaCriadas.push(mov);
      saidaPromises.push(this.supabaseInsert('movimentacoes_produtos', mov as unknown as Record<string, unknown>));
    }
    const saidaResults = await Promise.all(saidaPromises);
    if (saidaResults.some(r => !r)) return { success: false, error: 'Erro ao salvar no servidor' };
    for (const { idx, dados } of updatesEstoqueSaida) {
      this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? dados : e);
    }
    this.movProdutos = [...movsSaidaCriadas, ...this.movProdutos];
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  async reverterMovimentacoesPedido(pedidoId: string, opts: { restaurarInsumos?: boolean; removerProdutos?: boolean; reporEstoque?: boolean } = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const promises: Promise<boolean>[] = [];
      const updatesMateriais: { idx: number; dados: Material }[] = [];
      const updatesEstoque: { idx: number; dados: EstoqueProduto }[] = [];
      const delMovMateriais: string[] = [];
      const delMovProdutos: string[] = [];

      if (opts.restaurarInsumos) {
        const shortId = pedidoId.slice(-6).toUpperCase();
        const tipoSaidaProducao = this.tiposMovimentacao.find(t => t.nome === 'Saída Produção');
        const tipoSaidaProducaoId = tipoSaidaProducao ? tipoSaidaProducao.id : 2;
        const movsMateriais = this.movMateriais.filter(m =>
          m.observacao?.includes(shortId) && m.tipo_id === tipoSaidaProducaoId
        );
        for (const mov of movsMateriais) {
          const mat = this.materiais.find(m => m.id === mov.material_id);
          if (!mat) continue;
          const dadosMat = {
            ...mat,
            quantidade_atual: Number((mat.quantidade_atual + mov.quantidade).toFixed(3)),
            data_ultima_atualizacao: new Date().toISOString(),
          };
          updatesMateriais.push({ idx: this.materiais.indexOf(mat), dados: dadosMat });
          promises.push(this.supabaseUpdate('materiais', mat.id, dadosMat as unknown as Record<string, unknown>));
          delMovMateriais.push(mov.id);
          promises.push(supabase.from('movimentacoes_materiais').delete().eq('id', mov.id).then(r => !r.error) as Promise<boolean>);
        }
      }

      if (opts.removerProdutos) {
        const tipoEntradaProducao = this.tiposMovimentacao.find(t => t.nome === 'Entrada Produção');
        const tipoEntradaId = tipoEntradaProducao ? tipoEntradaProducao.id : 5;
        const movsEntrada = this.movProdutos.filter(m => m.pedido_id === pedidoId && (m.tipo_id === tipoEntradaId || m.tipo_id === 4));
        for (const mov of movsEntrada) {
          const estoque = this.estoqueProdutos.find(e => e.produto_id === mov.produto_id);
          if (estoque) {
            const novoQtd = Math.max(0, estoque.quantidade_disponivel - mov.quantidade);
            const updated = { ...estoque, quantidade_disponivel: novoQtd, data_atualizacao: new Date().toISOString() };
            updatesEstoque.push({ idx: this.estoqueProdutos.findIndex(e => e.id === updated.id), dados: updated });
            promises.push(this.supabaseUpdate('estoque_produtos', updated.id, updated as unknown as Record<string, unknown>));
          }
          delMovProdutos.push(mov.id);
          promises.push(supabase.from('movimentacoes_produtos').delete().eq('id', mov.id).then(r => !r.error) as Promise<boolean>);
        }
      }

      if (opts.reporEstoque) {
        const tipoSaidaPedido = this.tiposMovimentacao.find(t => t.nome === 'Saída Pedido');
        const tipoSaidaId = tipoSaidaPedido ? tipoSaidaPedido.id : 6;
        const movsSaida = this.movProdutos.filter(m => m.pedido_id === pedidoId && (m.tipo_id === tipoSaidaId || m.tipo_id === 5));
        for (const mov of movsSaida) {
          const estoque = this.estoqueProdutos.find(e => e.produto_id === mov.produto_id);
          if (estoque) {
            const updated = { ...estoque, quantidade_disponivel: estoque.quantidade_disponivel + mov.quantidade, data_atualizacao: new Date().toISOString() };
            updatesEstoque.push({ idx: this.estoqueProdutos.findIndex(e => e.id === updated.id), dados: updated });
            promises.push(this.supabaseUpdate('estoque_produtos', updated.id, updated as unknown as Record<string, unknown>));
          }
          delMovProdutos.push(mov.id);
          promises.push(supabase.from('movimentacoes_produtos').delete().eq('id', mov.id).then(r => !r.error) as Promise<boolean>);
        }
      }

      if (promises.length === 0) {
        this.saveToLocalStorage();
        this.notify();
        return { success: true };
      }

      const results = await Promise.all(promises);
      if (results.some(r => !r)) {
        return { success: false, error: this.error || 'Não foi possível reverter as movimentações.' };
      }

      for (const { idx, dados } of updatesMateriais) {
        if (idx !== -1) this.materiais = this.materiais.map((m, i) => i === idx ? dados : m);
      }
      for (const { idx, dados } of updatesEstoque) {
        if (idx !== -1) this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? dados : e);
      }
      if (delMovMateriais.length > 0) {
        this.movMateriais = this.movMateriais.filter(m => !delMovMateriais.includes(m.id));
      }
      if (delMovProdutos.length > 0) {
        this.movProdutos = this.movProdutos.filter(m => !delMovProdutos.includes(m.id));
      }

      this.saveToLocalStorage();
      this.notify();
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Ocorreu um erro inesperado ao desfazer as movimentações de estoque. Tente novamente ou contate o supervisor.' };
    }
  }

  // ================================================
  // LIMPEZA DE HISTÓRICO DE MOVIMENTAÇÕES
  // ================================================
  async deleteMovimentacoes(ids: string[], tipo: 'material' | 'produto'): Promise<{ success: boolean; removed: number; error?: string }> {
    if (ids.length === 0) return { success: true, removed: 0 };
    const table = tipo === 'material' ? 'movimentacoes_materiais' : 'movimentacoes_produtos';
    try {
      const { error } = await supabase.from(table).delete().in('id', ids);
      if (error) return { success: false, removed: 0, error: error.message };
      if (tipo === 'material') {
        this.movMateriais = this.movMateriais.filter(m => !ids.includes(m.id));
      } else {
        this.movProdutos = this.movProdutos.filter(m => !ids.includes(m.id));
      }
      this.saveToLocalStorage();
      this.notify();
      return { success: true, removed: ids.length };
    } catch {
      return { success: false, removed: 0, error: 'Sem conexão com o servidor.' };
    }
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
      if (idx >= 0) this.perfisUsuarios = this.perfisUsuarios.map((u, i) => i === idx ? { ...u, ...updates } : u);
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
      if (idx >= 0) this.unidades = this.unidades.map((u, i) => i === idx ? { ...u, ...data } : u);
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
    this.fornecedores = [...this.fornecedores, f];
    this.saveToLocalStorage(); this.notify();
    return f;
  }

  async updateFornecedor(id: number, data: Partial<Fornecedor>) {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from('fornecedores').update(data).eq('id', id);
    if (!error) {
      const idx = this.fornecedores.findIndex(f => f.id === id);
      if (idx >= 0) this.fornecedores = this.fornecedores.map((f, i) => i === idx ? { ...f, ...data } : f);
      this.saveToLocalStorage(); this.notify();
    }
  }

  async toggleFornecedorAtivo(id: number) {
    const f = this.fornecedores.find(f => f.id === id);
    if (!f || !isSupabaseConfigured()) return;
    const novoAtivo = !f.ativo;
    const { error } = await supabase.from('fornecedores').update({ ativo: novoAtivo }).eq('id', id);
    if (!error) {
      this.fornecedores = this.fornecedores.map(f2 => f2.id === id ? { ...f2, ativo: novoAtivo } : f2);
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
    if (ok) {
      this.lancamentos = [novo, ...this.lancamentos];
      this.saveToLocalStorage();
      this.notify();
    }
    return novo;
  }

  async updateLancamentoFinanceiro(id: string, updates: Partial<LancamentoFinanceiro>) {
    try {
      const idx = this.lancamentos.findIndex(l => l.id === id);
      if (idx === -1) return false;
      const ok = await this.supabaseUpdate('lancamentos_financeiros', id, updates as unknown as Record<string, unknown>);
      this.lancamentos = this.lancamentos.map(l => l.id === id ? { ...l, ...updates } : l);
      this.saveToLocalStorage();
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  async deleteLancamentoFinanceiro(id: string) {
    const ok = await this.supabaseDelete('lancamentos_financeiros', id);
    if (ok) {
      this.lancamentos = this.lancamentos.filter(l => l.id !== id);
      this.saveToLocalStorage();
      this.notify();
    }
  }

  async addCategoriaFinanceiro(data: { nome: string; tipo: 'receita' | 'despesa'; cor?: string }): Promise<CategoriaFinanceiro | null> {
    const novo: CategoriaFinanceiro = { id: Date.now(), nome: data.nome, tipo: data.tipo, cor: data.cor || '#6b7280' };
    if (isSupabaseConfigured()) {
      const { data: inserted, error } = await supabase.from('categorias_financeiro').insert({ nome: data.nome, tipo: data.tipo, cor: data.cor || '#6b7280' }).select().single();
      if (error) { this.setError(error.message, 'server'); return null; }
      this.categoriasFinanceiro.push(inserted);
    } else {
      this.categoriasFinanceiro.push(novo);
    }
    this.saveToLocalStorage();
    this.notify();
    return novo;
  }

  async updateCategoriaFinanceiro(id: number, updates: Partial<{ nome: string; cor: string }>) {
    const idx = this.categoriasFinanceiro.findIndex(c => c.id === id);
    if (idx === -1) return;
    const ok = await this.supabaseUpdate('categorias_financeiro', String(id), updates as unknown as Record<string, unknown>);
    if (ok) {
      this.categoriasFinanceiro = this.categoriasFinanceiro.map(c => c.id === id ? { ...c, ...updates } : c);
      this.saveToLocalStorage();
      this.notify();
    }
  }

  async deleteCategoriaFinanceiro(id: number) {
    const ok = await this.supabaseDelete('categorias_financeiro', String(id));
    if (ok) { this.categoriasFinanceiro = this.categoriasFinanceiro.filter(c => c.id !== id); this.saveToLocalStorage(); this.notify(); }
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
    let catId = pedido.categoria_receita_id;
    if (!catId) {
      const cat = this.categoriasFinanceiro.find(c => c.tipo === 'receita');
      catId = cat?.id || 1;
    }
    return await this.addLancamentoFinanceiro({
      data_lancamento: dataLancamento || dataLocal(),
      valor,
      tipo: 'receita',
      categoria_id: catId,
      descricao: `Pgto. pedido #${pedidoId.slice(-6)} - ${cliente?.nome || 'Cliente'}`,
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
        data_lancamento: dataLocal(),
        valor: rec.valor,
        tipo: 'despesa' as const,
        categoria_id: catEstornoId,
        descricao: `Estorno pedido #${pedidoId.slice(-6)} - ${rec.forma_pagamento || 'pgto'} #estorno`,
        pedido_id: pedidoId,
        forma_pagamento: rec.forma_pagamento,
        criado_em: new Date().toISOString(),
      };
      let ok = false;
      try { ok = await this.supabaseInsert('lancamentos_financeiros', estorno as unknown as Record<string, unknown>); } catch { ok = false; }
      this.lancamentos = [estorno, ...this.lancamentos];
    }

    this.error = null;
    this.errorType = null;
    this.saveToLocalStorage();
    this.notify();
    return { success: true };
  }

  // ================================================
  // VENDA DIRETA (Caixa, sem pedido)
  // ================================================
  async registrarVendaDireta(params: {
    itens: Array<{ produtoId: string; quantidade: number; precoUnitario: number }>;
    clienteId?: string;
    formaPagamento?: string;
    categoriaId: number;
    valorPago?: number;
    dataLancamento?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.error = null;
    this.errorType = null;

    for (const item of params.itens) {
      const estoque = this.estoqueProdutos.find(e => e.produto_id === item.produtoId);
      const disponivel = estoque?.quantidade_disponivel || 0;
      if (disponivel < item.quantidade) {
        const prod = this.produtos.find(p => p.id === item.produtoId);
        return { success: false, error: `Estoque insuficiente: ${prod?.nome || item.produtoId} (disponível: ${disponivel}, solicitado: ${item.quantidade})` };
      }
    }

    const promises: Promise<boolean>[] = [];
    const movsCriadas: MovimentacaoProduto[] = [];

    for (const item of params.itens) {
      const idx = this.estoqueProdutos.findIndex(e => e.produto_id === item.produtoId);
      if (idx >= 0) {
        const original = this.estoqueProdutos[idx];
        const updated = {
          ...original,
          quantidade_disponivel: Math.max(0, original.quantidade_disponivel - item.quantidade),
          data_atualizacao: new Date().toISOString()
        };
        this.estoqueProdutos = this.estoqueProdutos.map((e, i) => i === idx ? updated : e);
        promises.push(this.supabaseUpdate('estoque_produtos', updated.id, updated as unknown as Record<string, unknown>));
      }

      const mov: MovimentacaoProduto = {
        id: 'mov_p_' + Math.random().toString(36).substring(2, 9),
        produto_id: item.produtoId,
        tipo_id: this.getTipoVendaDiretaId(),
        quantidade: item.quantidade,
        observacao: params.clienteId ? `Venda direta — ${this.clientes.find(c => c.id === params.clienteId)?.nome || ''}` : 'Venda direta (balcão)',
        usuario_id: this.currentUserId ?? undefined,
        criado_em: params.dataLancamento ? (params.dataLancamento.includes('T') ? params.dataLancamento : params.dataLancamento + 'T' + new Date().toISOString().split('T')[1]) : new Date().toISOString()
      };
      movsCriadas.push(mov);
      promises.push(this.supabaseInsert('movimentacoes_produtos', mov as unknown as Record<string, unknown>));
    }

    const total = params.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0);
    const descricao = params.itens.map(i => {
      const prod = this.produtos.find(p => p.id === i.produtoId);
      return `${i.quantidade}x ${prod?.nome || i.produtoId}`;
    }).join(', ');

    const lanc = await this.addLancamentoFinanceiro({
      data_lancamento: params.dataLancamento || dataLocal(),
      valor: params.valorPago ?? total,
      tipo: 'receita',
      categoria_id: params.categoriaId,
      descricao: `Venda balcão: ${descricao}`,
      forma_pagamento: params.formaPagamento,
    });

    const results = await Promise.all(promises);
    if (results.some(r => !r)) return { success: false, error: 'Erro ao salvar movimentações no servidor.' };

    this.movProdutos = [...movsCriadas, ...this.movProdutos];
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
