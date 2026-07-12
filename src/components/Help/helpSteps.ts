export interface TourStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
  };
}

export interface ModuleHelp {
  moduleId: string;
  title: string;
  steps: TourStep[];
}

export const moduleHelp: ModuleHelp[] = [
  {
    moduleId: 'dashboard',
    title: 'Ajuda — Dashboard',
    steps: [
      { element: '[data-help="dashboard"]', popover: { title: 'Painel Geral', description: 'Visão geral do seu negócio: receitas, despesas, saldo e pedidos do dia.', side: 'right' } },
    ],
  },
  {
    moduleId: 'caixa',
    title: 'Ajuda — Caixa Rápido',
    steps: [
      { element: '[data-help="caixa"]', popover: { title: 'Caixa Rápido', description: 'Registre recebimentos de pedidos, receitas avulsas e despesas rápidas. Veja o resumo do dia à direita.', side: 'right' } },
    ],
  },
  {
    moduleId: 'estoque',
    title: 'Ajuda — Estoque de Assados',
    steps: [
      { element: '[data-help="estoque-novo"]', popover: { title: 'Ajustar Estoque', description: 'Clique aqui para adicionar, ajustar ou registrar lotes de produtos no estoque.', side: 'bottom' } },
      { element: '[data-help="estoque-busca"]', popover: { title: 'Buscar Produto', description: 'Use a barra de busca para encontrar rapidamente um produto específico.', side: 'bottom' } },
      { element: '[data-help="estoque-filtro"]', popover: { title: 'Filtros', description: 'Filtre por tipo: Todos, Estável, Abaixo do Mínimo, Esgotado ou Novo.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'pedidos',
    title: 'Ajuda — Produção e Pedidos',
    steps: [
      { element: '[data-help="pedidos-novo"]', popover: { title: 'Novo Pedido', description: 'Clique para criar um novo pedido. O sistema reserva estoque automaticamente.', side: 'bottom' } },
      { element: '[data-help="pedidos-kanban"]', popover: { title: 'Kanban', description: 'Visualize seus pedidos por status: Produzindo, Pronto, Entregue. Arraste para mudar status.', side: 'bottom' } },
      { element: '[data-help="pedidos-lista"]', popover: { title: 'Visualização em Lista', description: 'Alternne para lista para ver todos os pedidos com detalhes em tabela.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'financeiro',
    title: 'Ajuda — Financeiro',
    steps: [
      { element: '[data-help="financeiro-novo"]', popover: { title: 'Novo Lançamento', description: 'Registre uma entrada ou saída financeira. Selecione categoria, valor e forma de pagamento.', side: 'bottom' } },
      { element: '[data-help="financeiro-filtro"]', popover: { title: 'Filtros', description: 'Filtre por período, tipo (receita/despesa) e forma de pagamento.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'clientes',
    title: 'Ajuda — Clientes',
    steps: [
      { element: '[data-help="clientes-novo"]', popover: { title: 'Novo Cliente', description: 'Cadastre um novo cliente com dados de contato e endereço.', side: 'bottom' } },
      { element: '[data-help="clientes-busca"]', popover: { title: 'Buscar Cliente', description: 'Pesquise por nome, telefone ou email para encontrar um cliente rapidamente.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'produtos',
    title: 'Ajuda — Produtos e Fichas Técnicas',
    steps: [
      { element: '[data-help="produtos-novo"]', popover: { title: 'Novo Produto', description: 'Cadastre um novo produto acabado com nome, unidade e custo de produção.', side: 'bottom' } },
      { element: '[data-help="produtos-ficha"]', popover: { title: 'Ficha Técnica', description: 'Defina os insumos necessários para produzir cada unidade deste produto.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'materiais',
    title: 'Ajuda — Despensa de Insumos',
    steps: [
      { element: '[data-help="materiais-novo"]', popover: { title: 'Novo Material', description: 'Cadastre um novo insumo/matrÃ©ria-prima com quantidade e custo unitário.', side: 'bottom' } },
      { element: '[data-help="materiais-mov"]', popover: { title: 'Movimentar', description: 'Registre entradas e saídas de insumos com controle de quantidade.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'relatorios',
    title: 'Ajuda — Relatórios',
    steps: [
      { element: '[data-help="relatorios-card"]', popover: { title: 'Relatórios Disponíveis', description: 'Clique em um relatório para abrir. Cada um oferece filtros, tabela ordenável, exportação CSV e impressão.', side: 'bottom' } },
    ],
  },
  {
    moduleId: 'fornecedores',
    title: 'Ajuda — Fornecedores',
    steps: [
      { element: '[data-help="fornecedores"]', popover: { title: 'Fornecedores', description: 'Gerencie seus fornecedores de insumos e matérias-primas.', side: 'right' } },
    ],
  },
  {
    moduleId: 'config',
    title: 'Ajuda — Configurações',
    steps: [
      { element: '[data-help="config"]', popover: { title: 'Configurações', description: 'Configure os dados da empresa, logo, slogan e preferências do sistema.', side: 'right' } },
    ],
  },
  {
    moduleId: 'usuarios',
    title: 'Ajuda — Usuários',
    steps: [
      { element: '[data-help="usuarios"]', popover: { title: 'Usuários', description: 'Gerencie os acessos e permissões dos usuários do sistema.', side: 'right' } },
    ],
  },
];

export const getModuleHelp = (moduleId: string): ModuleHelp | undefined => {
  return moduleHelp.find(m => m.moduleId === moduleId);
};
