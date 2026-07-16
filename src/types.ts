export interface Unidade {
  id: number;
  sigla: string;
  nome: string;
  tipo: 'massa' | 'volume' | 'unidade';
}

export interface Categoria {
  id: number;
  nome: string;
  cor: string;
}

export interface StatusPedido {
  id: number;
  nome: string;
  ordem: number;
  cor: string;
}

export interface TipoMovimentacao {
  id: number;
  nome: string;
  natureza: 'entrada' | 'saida';
  entidade: 'produto' | 'material' | 'ambos';
}

export interface TipoCliente {
  id: number;
  nome: string;
  categoria_receita_id?: number;
}

export interface NivelAcesso {
  id: number;
  nome: string;
}

export interface Fornecedor {
  id: number;
  nome_fantasia: string;
  contato?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  criado_em?: string;
}

export interface Permissao {
  id: number;
  chave: string;
  nome: string;
  grupo: string;
}

export interface Perfil {
  id: number;
  nome: string;
  descricao: string;
}

export interface CategoriaFinanceiro {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
}

export interface LancamentoFinanceiro {
  id: string;
  data_lancamento: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria_id: number;
  descricao?: string;
  pedido_id?: string;
  movimentacao_id?: string;
  forma_pagamento?: string;
  criado_por?: string;
  criado_em?: string;
}

export interface PlanejamentoCompra {
  id: number;
  material_id: string;
  quantidade_sugerida: number;
  unidade_id?: number;
  data_sugerida?: string;
  status: 'pendente' | 'aprovado' | 'comprado' | 'cancelado';
  motivo?: string;
  consumo_medio_diario?: number;
  dias_ate_minimo?: number;
}

export interface Material {
  id: string;
  nome: string;
  unidade_id: number;
  quantidade_atual: number;
  quantidade_minima: number;
  custo_unitario: number;
  fornecedor_id?: number | null;
  data_ultima_atualizacao: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria_id: number;
  descricao: string;
  unidade_producao_id: number;
  tempo_producao_minutos: number;
  custo_producao_calculado: number;
  ativo: boolean;
  margem_lucro?: number;
  preco_venda?: number;
  imagem?: string;
}

export interface FichaTecnicaItem {
  id: string;
  produto_id: string;
  material_id: string;
  quantidade_necessaria: number;
  unidade_id: number;
}

export interface EstoqueProduto {
  id: string;
  produto_id: string;
  quantidade_disponivel: number;
  quantidade_minima: number;
  data_validade?: string;
  lote?: string;
  data_atualizacao: string;
}

export interface MovimentacaoProduto {
  id: string;
  produto_id: string;
  tipo_id: number;
  quantidade: number;
  pedido_id?: string;
  observacao?: string;
  usuario_id?: string;
  criado_em: string;
}

export interface MovimentacaoMaterial {
  id: string;
  material_id: string;
  tipo_id: number;
  quantidade: number;
  observacao?: string;
  valor_pago?: number;
  custo_unitario?: number;
  criado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  tipo_id: number;
  telefone: string;
  email: string;
  endereco: string;
  observacoes?: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  data_pedido: string;
  data_entrega_prevista: string;
  status_id: number;
  observacoes?: string;
  valor_total: number;
  criado_by: string;
  categoria_receita_id?: number;
  atualizado_em: string;
}

export interface ItemPedido {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade_solicitada: number;
  quantidade_produzida: number;
  preco_unitario: number;
  observacao?: string;
}

export interface PerfilPermissao {
  perfil_id: number;
  permissao_id: number;
}

export interface PerfilUsuario {
  id: string;
  nome: string;
  perfil_id: number;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface DadosEmpresa {
  nome_empresa: string;
  cnpj: string;
  inscricao_municipal: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  logo_url: string;
  slogan: string;
}

export interface DashboardStats {
  pedidosHoje: number;
  pedidosSemana: number;
  alertasEstoqueMateriais: number;
  alertasEstoqueProdutos: number;
  totalReceitaPedidosConfirmados: number;
  proximasEntregasCount: number;
}

