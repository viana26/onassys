/**
 * Types representing the database schema for the Salgados & Bolos Mini-Factory Management System.
 */

export interface Material {
  id: string;
  nome: string;
  unidade: 'kg' | 'g' | 'L' | 'mL' | 'un';
  quantidade_atual: number;
  quantidade_minima: number;
  custo_unitario: number; // cost per unit of purchase (e.g., cost per kg)
  fornecedor: string;
  data_ultima_atualizacao: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: 'salgado' | 'doce' | 'bolo' | 'bebida' | 'outro';
  descricao: string;
  unidade_producao: string; // e.g., "por dúzia", "por unidade", "por kg"
  tempo_producao_minutos: number;
  custo_producao_calculado: number;
  ativo: boolean;
  margem_lucro?: number;      // % of markup/profit
  preco_venda?: number;       // final selling price
  imagem?: string;            // compressed base64 image or local path
}

export interface FichaTecnicaItem {
  id: string;
  produto_id: string;
  material_id: string;
  quantidade_necessaria: number; // relative to the product unit (e.g., 0.150 kg for 1 unit, or total)
  unidade: 'kg' | 'g' | 'L' | 'mL' | 'un';
}

export interface EstoqueProduto {
  id: string;
  produto_id: string;
  quantidade_disponivel: number; // what is physically ready and unreserved
  quantidade_reservada: number;   // reserved for orders
  quantidade_minima: number;
  data_validade?: string;         // YYYY-MM-DD
  lote?: string;
  data_atualizacao: string;
}

export interface MovimentacaoProduto {
  id: string;
  produto_id: string;
  tipo: 'entrada_producao' | 'saida_pedido' | 'ajuste';
  quantidade: number;
  pedido_id?: string;
  observacao?: string;
  criado_em: string;
}

export interface MovimentacaoMaterial {
  id: string;
  material_id: string;
  tipo: 'entrada_compra' | 'saida_producao' | 'ajuste';
  quantidade: number;
  observacao?: string;
  valor_pago?: number;
  custo_unitario?: number;
  criado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  tipo: 'lanchonete' | 'evento' | 'particular' | 'outro';
  telefone: string;
  email: string;
  endereco: string;
  observacoes?: string;
}

export type PedidoStatus = 'rascunho' | 'confirmado' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';

export interface Pedido {
  id: string;
  cliente_id: string;
  data_pedido: string;
  data_entrega_prevista: string; // YYYY-MM-DDTHH:mm
  status: PedidoStatus;
  observacoes?: string;
  valor_total: number;
  criado_by: string;
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

// For UI dashboard reporting
export interface DashboardStats {
  pedidosHoje: number;
  pedidosSemana: number;
  alertasEstoqueMateriais: number; // materials below minimum
  alertasEstoqueProdutos: number;   // products below minimum
  totalReceitaPedidosConfirmados: number;
  proximasEntregasCount: number; // next 48 hours
}
