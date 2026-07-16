# Mapa do Sistema — Mini Fábrica

Um guia rápido para você encontrar onde fazer cada coisa no sistema.

---

## Painel Inicial (Dashboard)

**Para que serve:** Assim que você entra, tem uma visão geral do negócio — quanto faturou no mês, quais insumos estão acabando, quais pedidos precisam sair hoje.

| O que fazer | Onde clicar |
|---|---|
| Ver resumo do mês | Tela inicial após o login |
| Criar um pedido novo | Botão **"Novo Pedido"** no banner |
| Lançar um lote de produção | Botão **"Concluir Lote"** no banner |
| Ver ingredientes em falta | Card **"Insumos Críticos"** (em vermelho piscando) |
| Ver produtos acabados baixos | Card **"Prontos Abaixo do Mínimo"** |
| Ver quem ainda deve | Card **"A Receber"** |
| Ver o que produzir hoje | Seção **"O Que Produzir Hoje"** (mostra se tem ou não insumo) |
| Ver validades próximas | Seção **"Validades Próximas"** |
| Ver gráfico de fluxo de caixa | Gráfico de linha nos últimos 30 dias |
| Ver resumo de receita vs despesa | Gráfico de rosca (doughnut) |

---

## Insumos (Matérias-Primas)

**Para que serve:** Controlar ingredientes, matéria-prima, compras e fornecedores.

| Aba | O que tem |
|---|---|
| **Estoque de Insumos** | Lista de todos os ingredientes com estoque, mínimo, preço |
| **Movimentações** | Histórico de entradas e saídas |

### Estoque de Insumos

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo ingrediente | Botão **"Novo Ingrediente"** |
| Editar ingrediente | Ícone de lápis no card |
| Excluir ingrediente | Ícone de lixeira |
| Registrar compra / entrada | Botão **"+ Compra/Entrada"** no item |
| Gerar despesa no financeiro | Toggle no modal de compra (opcional) |
| Filtrar só ingredientes em falta | Botões **"Em Falta" / "Crítico" / "Com Estoque"** |
| Vincular fornecedor | No cadastro do ingrediente, escolher fornecedor principal |

### Movimentações

| O que fazer | Onde clicar |
|---|---|
| Ver histórico | Aba **"Movimentações"** |
| Excluir movimentações | Selecionar itens → botão **"Excluir selecionados"** |
| Filtrar por tipo ou data | Filtros no topo da tabela |

---

## Produtos (Cardápio)

**Para que serve:** Cadastrar os produtos que você vende (coxinhas, bolos, doces...) com suas receitas, calcular custo e definir preço.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo produto | Botão **"Novo Produto"** |
| Editar produto / receita | Ícone de lápis |
| Excluir produto | Ícone de lixeira |
| Adicionar foto | Aba **"Informações Básicas"** → upload de imagem |
| Montar receita (ingredientes) | Aba **"Composição da Receita"** |
| Ver custo e margem | Na edição, ao vivo conforme adiciona ingredientes |
| Definir preço de venda | Campo **"Preço Venda"** (automático ou manual) |
| Taxa de lucro (markup) | Ajustar percentual sobre o custo |
| Ver se pode produzir | Botão **"Simular Produção"** no card do produto |
| Ver ficha técnica | Expandir card do produto |

---

## Estoque (Produtos Acabados)

**Para que serve:** Controlar os produtos prontos na prateleira, lotes, validades e dar baixa na produção.

| Aba | O que tem |
|---|---|
| **Estoque de Produtos** | Lista de produtos acabados com quantidade, lote, validade |
| **Movimentações** | Histórico de entradas e saídas |

### Estoque de Produtos

| O que fazer | Onde clicar |
|---|---|
| Registrar lote de produção | Botão **"Lançar Lote"** |
| Ajustar estoque manualmente | Botão **"Ajustar"** no item |
| Definir estoque mínimo | No modal de ajuste → campo **"Qtd. Mínima"** |
| Ver validades próximas | Filtro **"Validades"** |
| Ver produtos zerados | Filtro **"Sem Estoque"** |
| Gerar lote automático | Botão **"Gerar"** no campo de lote |

> Ao lançar um lote, o sistema **verifica se tem insumos** na despensa e consome automaticamente.

### Movimentações

| O que fazer | Onde clicar |
|---|---|
| Ver histórico | Aba **"Movimentações"** |
| Excluir movimentações | Selecionar itens → **"Excluir selecionados"** |
| Filtrar por produto, tipo ou data | Filtros no topo |

---

## Clientes

**Para que serve:** Cadastro de clientes — lanchonetes, buffets, particulares etc.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo cliente | Botão **"Novo Cliente"** |
| Editar cliente | Ícone de lápis |
| Excluir cliente | Ícone de lixeira |
| Buscar cliente | Campo de busca (nome, telefone, endereço) |
| Filtrar por tipo | Seletor de tipo de cliente |

---

## Pedidos

**Para que serve:** O coração do sistema. Criar pedidos, acompanhar a produção no Kanban, entregar e gerenciar estornos.

| Aba | O que tem |
|---|---|
| **Kanban** | Quadro visual com colunas: Confirmado → Produzindo → Pronto → Entregue |
| **Carga de Trabalho** | Planejador semanal dos próximos 7 dias |
| **Lista Geral** | Tabela com todos os pedidos e busca |

### Kanban (Quadro de Produção)

| O que fazer | Onde clicar |
|---|---|
| Criar novo pedido | Botão **"Novo Pedido"** |
| Mover pedido de fase | Arrastar cartão entre colunas (ou usar botões no card) |
| Iniciar produção | Botão **"Cozinha"** no card |
| Marcar como pronto | Botão **"Pronto!"** no card |
| Registrar entrega | Botão **"Entregar"** no card |
| Cancelar ou voltar fase | Arrastar para trás → modal de reversão |
| Ver detalhes do pedido | Clicar no cartão |

### Detalhes do Pedido

| O que fazer | Onde clicar |
|---|---|
| Ver itens e valores | Modal de detalhes |
| Verificar se tem estoque | Botão **"Analisar Estoque & Insumos"** |
| Ver pagamentos recebidos | Seção **"Pagamentos"** |
| Imprimir ficha de produção | Botão **"Imprimir Ficha Técnica"** |

### Cancelamento / Estorno

Quando você volta ou cancela um pedido, aparece um modal com opções que mudam conforme o estágio em que ele está:

| Estágio | O que aparece |
|---|---|
| **Confirmado / Produzindo** | Só confirmação — nenhum estoque foi mexido ainda |
| **Pronto** | Opções: reverter produção e/ou restaurar insumos |
| **Entregue** | Opções: reverter produção, repor produtos no estoque e/ou estornar pagamento |

Pedidos com estorno pendente mostram um **badge laranja "⚠️ Estorno Pendente"** no card e na lista.

### Planejador Semanal

| O que fazer | Onde clicar |
|---|---|
| Ver carga da semana | Aba **"Carga de Trabalho"** |
| Ver unidades por categoria | Cards de cada dia mostram salgados, doces, bolos |

### Lista Geral

| O que fazer | Onde clicar |
|---|---|
| Buscar pedido | Campo de busca (cliente ou código) |
| Ver estornos pendentes | Botão **"⚠️ Estorno Pendente"** |

---

## Caixa

**Para que serve:** Receber pagamentos, registrar receitas e despesas avulsas, emitir comprovante.

| O que fazer | Onde clicar |
|---|---|
| Receber pagamento de pedido | Buscar pedido → selecionar → escolher forma de pagamento |
| Registrar receita avulsa | Botão **"Receita Livre"** |
| Registrar despesa avulsa | Botão **"Despesa Rápida"** |
| Ver extrato do dia | Lista abaixo dos botões |
| Imprimir comprovante | Após receber → botão **"Imprimir"** |
| Calcular troco | Selecionar **"Dinheiro"** → digitar valor pago |
| Formas de pagamento | Dinheiro, Pix, Crédito, Débito, Transferência |

---

## Financeiro

**Para que serve:** Visão completa de todas as receitas e despesas do sistema.

| O que fazer | Onde clicar |
|---|---|
| Ver lançamentos | Tela inicial do Financeiro |
| Filtrar receitas / despesas | Botões **"Todas / Receitas / Despesas"** |
| Registrar lançamento avulso | Botão **"Novo Lançamento"** |
| Gerenciar categorias | Dentro do modal de novo lançamento |
| Excluir lançamento | Ícone de lixeira na linha |
| Ver balancete do período | Botão **"Relatório"** |

> Lançamentos de pedidos e compras são registrados **automaticamente** pelo Caixa e pela Despensa.

---

## Relatórios

**Para que serve:** Hub central com todos os relatórios do sistema. Cada um abre em tela cheia com opção de filtrar, exportar CSV e imprimir.

| Relatório | O que mostra |
|---|---|
| **Demonstração do Resultado** | Receitas e despesas agrupadas por categoria, com resultado líquido |
| **Fluxo de Caixa** | Entradas, saídas e evolução do saldo com gráfico |
| **Nível de Estoque** | Posição atual do estoque com status e validades |
| **Ranking de Clientes** | Clientes que mais compram por valor e frequência |
| **Desempenho de Produtos** | Produtos mais vendidos, receita e margem |
| **Consumo de Insumos** | Ingredientes mais usados na produção e custos |
| **Receitas por Pagamento** | Receitas detalhadas por forma de pagamento |
| **Movimentações de Estoque** | Histórico de entradas e saídas de produtos |
| **Lucratividade por Pedido** | Custo, preço, recebido e lucro por pedido |

---

## Fornecedores

**Para que serve:** Cadastro de fornecedores de insumos.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo fornecedor | Botão **"Novo Fornecedor"** |
| Editar fornecedor | Ícone de lápis |
| Ativar / Desativar | Ícone de toggle |
| Excluir fornecedor | Ícone de lixeira (bloqueado se tiver insumos vinculados) |
| Buscar fornecedor | Campo de busca |
| Ver quantos insumos atende | Coluna **"Materiais"** na tabela |

---

## Usuários (só Administrador)

**Para que serve:** Gerenciar quem acessa o sistema e o que cada um pode fazer.

| O que fazer | Onde clicar |
|---|---|
| Criar novo usuário | Botão **"Novo Usuário"** |
| Editar usuário | Ícone de lápis |
| Ativar / Desativar | Botão de toggle |
| Excluir usuário | Ícone de lixeira |
| Redefinir senha | Botão **"Redefinir Senha"** |
| Ver código de recuperação | Exibido na criação e no primeiro login do usuário |

---

## Configurações

**Para que serve:** Dados da sua empresa.

| O que fazer | Onde clicar |
|---|---|
| Alterar nome do sistema | Campo **"Nome / Razão Social"** |
| Colocar slogan | Campo **"Slogan"** |
| Inserir CNPJ | Campo **"CNPJ / CPF"** |
| Colocar endereço e contato | Seções de **Endereço** e **Contato** |
| Adicionar logo | Upload de imagem no topo |
| Salvar tudo | Botão **"Salvar"** |

---

## Ajuda

**Para que serve:** Spotlight interativo que mostra onde fica cada coisa na tela.

| O que fazer | Onde clicar |
|---|---|
| Ativar ajuda do módulo atual | Botão **"Ajuda!"** na sidebar (sempre visível) |

---

## Fora do sistema (Tela de Login)

| O que fazer | Onde clicar |
|---|---|
| Entrar no sistema | Login → Email + Senha → **"Entrar"** |
| Criar primeiro administrador | Tela **"Criar primeiro administrador"** (se não houver nenhum) |
| Recuperar senha | **"Esqueci minha senha"** → Email → Código de recuperação → Nova senha |

---

## Dicas Rápidas

- **Desktop:** Sidebar à esquerda com todos os módulos. Arraste cartões no Kanban.
- **Celular:** Menu inferior (Dashboard, Insumos, Pedidos, Estoque). Os demais módulos ficam no menu lateral (ícone de menu).
- **Botão "+"** no celular: atalho rápido para criar um novo pedido.
- **Badge laranja "⚠️ Estorno Pendente":** aparece em pedidos cancelados que ainda têm valores a devolver.
- **Filtros rápidos** nos cards dos relatórios: use os botões de filtro no topo para refinar os dados.
