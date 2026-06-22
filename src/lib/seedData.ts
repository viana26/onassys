import { Material, Produto, FichaTecnicaItem, EstoqueProduto, Cliente, Pedido, ItemPedido, MovimentacaoMaterial, MovimentacaoProduto } from '../types';

export const INITIAL_MATERIAIS: Material[] = [
  {
    id: 'mat_1',
    nome: 'Farinha de trigo',
    unidade: 'kg',
    quantidade_atual: 45.5,
    quantidade_minima: 15.0,
    custo_unitario: 5.50, // R$ 5.50 por kg
    fornecedor: 'Moinho Central',
    data_ultima_atualizacao: '2026-06-05T08:00:00Z',
  },
  {
    id: 'mat_2',
    nome: 'Frango desfiado cozido',
    unidade: 'kg',
    quantidade_atual: 8.2,
    quantidade_minima: 10.0, // Alerta: abaixo do mínimo!
    custo_unitario: 18.90, // R$ 18.90 por kg
    fornecedor: 'Avícola Imperial',
    data_ultima_atualizacao: '2026-06-07T14:30:00Z',
  },
  {
    id: 'mat_3',
    nome: 'Óleo de soja',
    unidade: 'L',
    quantidade_atual: 12.0,
    quantidade_minima: 5.0,
    custo_unitario: 6.80, // R$ 6.80 por L
    fornecedor: 'Distribuidora Aliança',
    data_ultima_atualizacao: '2026-06-04T10:15:00Z',
  },
  {
    id: 'mat_4',
    nome: 'Açúcar refinado',
    unidade: 'kg',
    quantidade_atual: 28.0,
    quantidade_minima: 10.0,
    custo_unitario: 4.20,
    fornecedor: 'Usina União',
    data_ultima_atualizacao: '2026-06-05T08:00:00Z',
  },
  {
    id: 'mat_5',
    nome: 'Leite condensado',
    unidade: 'un', // latas
    quantidade_atual: 42,
    quantidade_minima: 12,
    custo_unitario: 7.50,
    fornecedor: 'Nestlé Atacado',
    data_ultima_atualizacao: '2026-06-06T11:00:00Z',
  },
  {
    id: 'mat_6',
    nome: 'Ovos brancos',
    unidade: 'un',
    quantidade_atual: 150,
    quantidade_minima: 60,
    custo_unitario: 0.60,
    fornecedor: 'Granja Recanto',
    data_ultima_atualizacao: '2026-06-07T09:00:00Z',
  },
  {
    id: 'mat_7',
    nome: 'Abacaxi maduro',
    unidade: 'un',
    quantidade_atual: 10,
    quantidade_minima: 5,
    custo_unitario: 6.00,
    fornecedor: 'Feira do Produtor',
    data_ultima_atualizacao: '2026-06-07T16:00:00Z',
  },
  {
    id: 'mat_8',
    nome: 'Chocolate em pó 50%',
    unidade: 'kg',
    quantidade_atual: 5.4,
    quantidade_minima: 3.0,
    custo_unitario: 24.50,
    fornecedor: 'Doces & Cia Distribuidora',
    data_ultima_atualizacao: '2026-06-05T08:00:00Z',
  },
];

export const INITIAL_PRODUTOS: Produto[] = [
  {
    id: 'prod_1',
    nome: 'Mini-coxinha de Frango',
    categoria: 'salgado',
    descricao: 'Deliciosa coxinha miniatura recheada com peito de frango temperado.',
    unidade_producao: 'por dúzia',
    tempo_producao_minutos: 25,
    custo_producao_calculado: 4.50, // auto calculated later
    ativo: true,
  },
  {
    id: 'prod_2',
    nome: 'Coxinha grande',
    categoria: 'salgado',
    descricao: 'Coxinha tamanho lanche tradicional super recheada de frango desfiado.',
    unidade_producao: 'por unidade',
    tempo_producao_minutos: 15,
    custo_producao_calculado: 1.80,
    ativo: true,
  },
  {
    id: 'prod_3',
    nome: 'Mini-pastel de vento de vento recheado',
    categoria: 'salgado',
    descricao: 'Pastel frito na hora tamanho festa.',
    unidade_producao: 'por dúzia',
    tempo_producao_minutos: 20,
    custo_producao_calculado: 3.20,
    ativo: true,
  },
  {
    id: 'prod_4',
    nome: 'Bolo de chocolate festa',
    categoria: 'bolo',
    descricao: 'Bolo fofinho de chocolate com cobertura cremosa e granulado.',
    unidade_producao: 'por unidade',
    tempo_producao_minutos: 90,
    custo_producao_calculado: 25.50,
    ativo: true,
  },
  {
    id: 'prod_5',
    nome: 'Bolo de abacaxi com coco',
    categoria: 'bolo',
    descricao: 'Bolo gelado de abacaxi caldoso com flocos de coco fresco.',
    unidade_producao: 'por unidade',
    tempo_producao_minutos: 100,
    custo_producao_calculado: 22.00,
    ativo: true,
  },
  {
    id: 'prod_6',
    nome: 'Brigadeiro gourmet',
    categoria: 'doce',
    descricao: 'Brigadeiro tradicional feito com leite condensado e cacau nobre.',
    unidade_producao: 'por dúzia',
    tempo_producao_minutos: 15,
    custo_producao_calculado: 5.10,
    ativo: true,
  },
  {
    id: 'prod_7',
    nome: 'Brotinho doce de leite',
    categoria: 'doce',
    descricao: 'Mini pizza/tartlet doce recheada com generoso doce de leite artesanal.',
    unidade_producao: 'por dúzia',
    tempo_producao_minutos: 30,
    custo_producao_calculado: 8.50,
    ativo: true,
  },
];

export const INITIAL_FICHAS_TECNICAS: FichaTecnicaItem[] = [
  // Mini-coxinha (por dúzia): precisa de 0.25kg farinha trigo, 0.15kg frango desfiado, 0.05L óleo
  {
    id: 'ft_1',
    produto_id: 'prod_1',
    material_id: 'mat_1', // trigo
    quantidade_necessaria: 0.25,
    unidade: 'kg',
  },
  {
    id: 'ft_2',
    produto_id: 'prod_1',
    material_id: 'mat_2', // frango
    quantidade_necessaria: 0.15,
    unidade: 'kg',
  },
  {
    id: 'ft_3',
    produto_id: 'prod_1',
    material_id: 'mat_3', // oleo
    quantidade_necessaria: 0.05,
    unidade: 'L',
  },

  // Coxinha grande (por unidade): trigo 0.08kg, frango 0.05kg, oleo 0.015L
  {
    id: 'ft_4',
    produto_id: 'prod_2',
    material_id: 'mat_1',
    quantidade_necessaria: 0.08,
    unidade: 'kg',
  },
  {
    id: 'ft_5',
    produto_id: 'prod_2',
    material_id: 'mat_2',
    quantidade_necessaria: 0.05,
    unidade: 'kg',
  },
  {
    id: 'ft_6',
    produto_id: 'prod_2',
    material_id: 'mat_3',
    quantidade_necessaria: 0.015,
    unidade: 'L',
  },

  // Mini-pastel (por dúzia): trigo 0.3kg, oleo 0.08L
  {
    id: 'ft_7',
    produto_id: 'prod_3',
    material_id: 'mat_1',
    quantidade_necessaria: 0.3,
    unidade: 'kg',
  },
  {
    id: 'ft_8',
    produto_id: 'prod_3',
    material_id: 'mat_3',
    quantidade_necessaria: 0.08,
    unidade: 'L',
  },

  // Bolo chocolate (por unidade): oleo 0.1L, ovos 4un, acucar 0.4kg, farinha 0.35kg, chocolate 0.15kg
  {
    id: 'ft_9',
    produto_id: 'prod_4',
    material_id: 'mat_3',
    quantidade_necessaria: 0.1,
    unidade: 'L',
  },
  {
    id: 'ft_10',
    produto_id: 'prod_4',
    material_id: 'mat_6',
    quantidade_necessaria: 4,
    unidade: 'un',
  },
  {
    id: 'ft_11',
    produto_id: 'prod_4',
    material_id: 'mat_4',
    quantidade_necessaria: 0.4,
    unidade: 'kg',
  },
  {
    id: 'ft_12',
    produto_id: 'prod_4',
    material_id: 'mat_1',
    quantidade_necessaria: 0.35,
    unidade: 'kg',
  },
  {
    id: 'ft_13',
    produto_id: 'prod_4',
    material_id: 'mat_8',
    quantidade_necessaria: 0.15,
    unidade: 'kg',
  },

  // Bolo de abacaxi (por unidade): farinha 0.35kg, acucar 0.5kg, ovos 3un, abacaxi 1un
  {
    id: 'ft_14',
    produto_id: 'prod_5',
    material_id: 'mat_1',
    quantidade_necessaria: 0.35,
    unidade: 'kg',
  },
  {
    id: 'ft_15',
    produto_id: 'prod_5',
    material_id: 'mat_4',
    quantidade_necessaria: 0.5,
    unidade: 'kg',
  },
  {
    id: 'ft_16',
    produto_id: 'prod_5',
    material_id: 'mat_6',
    quantidade_necessaria: 3,
    unidade: 'un',
  },
  {
    id: 'ft_17',
    produto_id: 'prod_5',
    material_id: 'mat_7',
    quantidade_necessaria: 1,
    unidade: 'un',
  },

  // Brigadeiro gourmet (por dúzia): leite condensado 1un, chocolate 0.08kg, ovos (gemas) 1un
  {
    id: 'ft_18',
    produto_id: 'prod_6',
    material_id: 'mat_5',
    quantidade_necessaria: 1,
    unidade: 'un',
  },
  {
    id: 'ft_19',
    produto_id: 'prod_6',
    material_id: 'mat_8',
    quantidade_necessaria: 0.08,
    unidade: 'kg',
  },
  {
    id: 'ft_20',
    produto_id: 'prod_6',
    material_id: 'mat_6',
    quantidade_necessaria: 1,
    unidade: 'un',
  },

  // Brotinho doce de leite (por dúzia): farinha 0.2kg, leite condensado 1un
  {
    id: 'ft_21',
    produto_id: 'prod_7',
    material_id: 'mat_1',
    quantidade_necessaria: 0.2,
    unidade: 'kg',
  },
  {
    id: 'ft_22',
    produto_id: 'prod_7',
    material_id: 'mat_5',
    quantidade_necessaria: 1,
    unidade: 'un',
  },
];

export const INITIAL_ESTOQUE_PRODUTOS: EstoqueProduto[] = [
  {
    id: 'ep_1',
    produto_id: 'prod_1', // mini-coxinha
    quantidade_disponivel: 18, // 18 dúzias prontas
    quantidade_reservada: 5,
    quantidade_minima: 10,
    data_validade: '2026-06-12',
    lote: 'L-260608A',
    data_atualizacao: '2026-06-08T00:00:00Z',
  },
  {
    id: 'ep_2',
    produto_id: 'prod_2', // coxinha grande
    quantidade_disponivel: 35,
    quantidade_reservada: 12,
    quantidade_minima: 15,
    data_validade: '2026-06-10',
    lote: 'L-260608B',
    data_atualizacao: '2026-06-08T00:00:00Z',
  },
  {
    id: 'ep_3',
    produto_id: 'prod_3', // mini-pastel
    quantidade_disponivel: 2, // Quase sem nada
    quantidade_reservada: 0,
    quantidade_minima: 10,  // Alerta: abaixo do mínimo!
    data_validade: '2026-06-09',
    lote: 'L-260607A',
    data_atualizacao: '2026-06-07T12:00:00Z',
  },
  {
    id: 'ep_4',
    produto_id: 'prod_4', // bolo chocolate
    quantidade_disponivel: 4,
    quantidade_reservada: 2,
    quantidade_minima: 2,
    data_validade: '2026-06-11',
    lote: 'L-260607B',
    data_atualizacao: '2026-06-07T14:00:00Z',
  },
  {
    id: 'ep_5',
    produto_id: 'prod_5', // bolo de abacaxi
    quantidade_disponivel: 0, // zerado
    quantidade_reservada: 0,
    quantidade_minima: 2, // Alerta: abaixo do mínimo!
    data_validade: undefined,
    lote: undefined,
    data_atualizacao: '2026-06-06T10:00:00Z',
  },
  {
    id: 'ep_6',
    produto_id: 'prod_6', // brigadeiro
    quantidade_disponivel: 25,
    quantidade_reservada: 15,
    quantidade_minima: 15,
    data_validade: '2026-06-15',
    lote: 'L-260608C',
    data_atualizacao: '2026-06-08T01:00:00Z',
  },
  {
    id: 'ep_7',
    produto_id: 'prod_7', // brotinho
    quantidade_disponivel: 8,
    quantidade_reservada: 5,
    quantidade_minima: 5,
    data_validade: '2026-06-13',
    lote: 'L-260608D',
    data_atualizacao: '2026-06-08T02:00:00Z',
  },
];

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'cli_1',
    nome: 'Lanchonete do João',
    tipo: 'lanchonete',
    telefone: '(11) 98765-4321',
    email: 'joao.lanches@email.com',
    endereco: 'Rua das Flores, 123 - Centro, São Paulo - SP',
    observacoes: 'Entregar sempre pela manhã na porta de serviços.',
  },
  {
    id: 'cli_2',
    nome: 'Buffet Festas & Cia',
    tipo: 'evento',
    telefone: '(11) 99123-4567',
    email: 'contato@festasecia.com.br',
    endereco: 'Av. Paulista, 1500 - Bela Vista, São Paulo - SP',
    observacoes: 'Pedidos volumosos para finais de semana.',
  },
  {
    id: 'cli_3',
    nome: 'Escola Municipal Centro',
    tipo: 'particular', // or institutional
    telefone: '(11) 3222-8899',
    email: 'direcao@escolaemc.edu.br',
    endereco: 'Praça da República, 45 - Centro, São Paulo - SP',
    observacoes: 'Pagamento faturado em 15 dias.',
  },
];

// Current date simulated: 2026-06-08 (Monday)
export const INITIAL_PEDIDOS: Pedido[] = [
  {
    id: 'ped_1',
    cliente_id: 'cli_1',
    data_pedido: '2026-06-07T10:00:00Z',
    data_entrega_prevista: '2026-06-08T16:00', // Hoje à tarde!
    status: 'confirmado',
    observacoes: 'Coxinhas bem douradas.',
    valor_total: 105.00,
    criado_by: 'Viana',
    atualizado_em: '2026-06-07T10:00:00Z',
  },
  {
    id: 'ped_2',
    cliente_id: 'cli_2',
    data_pedido: '2026-06-06T14:00:00Z',
    data_entrega_prevista: '2026-06-09T11:00', // Amanhã
    status: 'em_producao',
    observacoes: 'Para um evento de meio-dia.',
    valor_total: 380.00,
    criado_by: 'Viana',
    atualizado_em: '2026-06-08T08:00:00Z',
  },
  {
    id: 'ped_3',
    cliente_id: 'cli_3',
    data_pedido: '2026-06-05T09:00:00Z',
    data_entrega_prevista: '2026-06-10T14:00', // Quarta-feira
    status: 'rascunho',
    observacoes: 'Aguardando confirmação da quantidade.',
    valor_total: 120.00,
    criado_by: 'Viana',
    atualizado_em: '2026-06-05T09:00:00Z',
  },
  {
    id: 'ped_4',
    cliente_id: 'cli_1',
    data_pedido: '2026-06-04T11:00:00Z',
    data_entrega_prevista: '2026-06-05T16:00', // Passado, ja entregue
    status: 'entregue',
    observacoes: 'Sucesso.',
    valor_total: 65.00,
    criado_by: 'Viana',
    atualizado_em: '2026-06-05T16:30:00Z',
  },
];

export const INITIAL_ITENS_PEDIDO: ItemPedido[] = [
  // De ped_1 (Lanchonete do João, R$ 105 total)
  {
    id: 'ip_1',
    pedido_id: 'ped_1',
    produto_id: 'prod_1', // Mini-coxinha (dúzia)
    quantidade_solicitada: 5, // 5 dúzias = R$ 15.00 a dúzia venda
    quantidade_produzida: 5,
    preco_unitario: 15.00,
  },
  {
    id: 'ip_2',
    pedido_id: 'ped_1',
    produto_id: 'prod_2', // Coxinha grande (unidade)
    quantidade_solicitada: 12, // R$ 2.50 cada
    quantidade_produzida: 12,
    preco_unitario: 2.50,
  },
  {
    id: 'ip_3',
    pedido_id: 'ped_1',
    produto_id: 'prod_6', // Brigadeiro (dúzia)
    quantidade_solicitada: 3, // R$ 15.00 a dúzia
    quantidade_produzida: 0,
    preco_unitario: 15.00,
  },

  // De ped_2 (Buffet Festas & Cia, R$ 380 total)
  {
    id: 'ip_4',
    pedido_id: 'ped_2',
    produto_id: 'prod_4', // Bolo chocolate festa (unidade)
    quantidade_solicitada: 2, // R$ 80.00 cada
    quantidade_produzida: 0,
    preco_unitario: 80.00,
  },
  {
    id: 'ip_5',
    pedido_id: 'ped_2',
    produto_id: 'prod_6', // Brigadeiro (dúzia)
    quantidade_solicitada: 10, // R$ 15.00 a dúzia
    quantidade_produzida: 4,
    preco_unitario: 15.00,
  },
  {
    id: 'ip_6',
    pedido_id: 'ped_2',
    produto_id: 'prod_7', // Brotinho doce de leite (dúzia)
    quantidade_solicitada: 5, // R$ 14.00 a dúzia
    quantidade_produzida: 0,
    preco_unitario: 14.00,
  },

  // De ped_3 (Escola, R$ 120 total)
  {
    id: 'ip_7',
    pedido_id: 'ped_3',
    produto_id: 'prod_3', // Mini-pastel (dúzia)
    quantidade_solicitada: 8, // R$ 15.00 a dúzia
    quantidade_produzida: 0,
    preco_unitario: 15.00,
  },
];

export const INITIAL_MOVIMENTACOES_MATERIAIS: MovimentacaoMaterial[] = [
  {
    id: 'mm_1',
    material_id: 'mat_1',
    tipo: 'entrada_compra',
    quantidade: 25.0,
    observacao: 'Compra de farinha - Moinho Central',
    criado_em: '2026-06-05T08:00:00Z',
  },
  {
    id: 'mm_2',
    material_id: 'mat_2',
    tipo: 'saida_producao',
    quantidade: 1.5,
    observacao: 'Produção lote coxinhas L-260608A',
    criado_em: '2026-06-08T00:00:00Z',
  },
];

export const INITIAL_MOVIMENTACOES_PRODUTOS: MovimentacaoProduto[] = [
  {
    id: 'mp_1',
    produto_id: 'prod_1',
    tipo: 'entrada_producao',
    quantidade: 10,
    observacao: 'Produção lote L-260608A',
    criado_em: '2026-06-08T00:00:00Z',
  },
  {
    id: 'mp_2',
    produto_id: 'prod_1',
    tipo: 'saida_pedido',
    quantidade: 5,
    pedido_id: 'ped_4',
    observacao: 'Baixa por entrega de pedido',
    criado_em: '2026-06-05T16:30:00Z',
  },
];
