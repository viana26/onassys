# 🗺️ Mapa do Sistema — Mini Fábrica

Um guia rápido para você encontrar onde fazer cada coisa.

---

## 📊 Dashboard (Painel Geral)

**O que faz aqui:** Visão geral do negócio — faturamento do mês, pedidos do dia, insumos críticos, próximas entregas.

| O que fazer | Onde clicar |
|---|---|
| Ver resumo do mês | Tela inicial após o login |
| Ir para Pedidos | Botão **"Novo Pedido"** no banner |
| Ir para Estoque | Botão **"Concluir Lote"** no banner |
| Ver insumos em falta | Card **"Insumos Críticos"** |
| Ver produtos acabados baixos | Card **"Prontos Abaixo do Mínimo"** |
| Ver quem deve | Seção **"A Receber"** |

---

## 🧂 Despensa (Insumos / Matérias-Primas)

**O que faz aqui:** Controlar ingredientes, estoque de matéria-prima, compras e fornecedores.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo ingrediente | **Despensa → Botão "Novo Insumo"** |
| Editar ingrediente | **Card do ingrediente → Botão "Editar"** |
| Excluir ingrediente | **Card do ingrediente → Botão "Excluir"** |
| Registrar compra / entrada | **Card do ingrediente → Botão "Entrada"** |
| Ver histórico de movimentações | **Aba "Histórico"** |
| Filtrar só ingredientes em falta | **Checkbox "Somente críticos"** |
| Cadastrar fornecedor | No formulário de cadastro/edição do ingrediente |

---

## 📝 Fichas Técnicas & Cardápio

**O que faz aqui:** Cadastrar produtos finais (coxinhas, bolos, doces) com suas receitas, calcular custo e definir preço.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo produto | **Cardápio → Botão "Novo Produto"** |
| Editar produto / receita | **Card do produto → Botão "Editar"** |
| Excluir produto | **Card do produto → Botão "Excluir"** |
| Ver ficha técnica (ingredientes) | **Card do produto → clicar para expandir** |
| Simular viabilidade | **Ficha técnica expandida → "Simular Viabilidade"** |
| Adicionar foto do produto | No formulário de edição → **"Adicionar Foto"** |
| Calcular preço com margem | No formulário de edição → **Calculadora de Preço** |

---

## 📦 Estoque (Produtos Acabados)

**O que faz aqui:** Controlar produtos prontos na prateleira, lotes, validades e dar baixa na produção.

| O que fazer | Onde clicar |
|---|---|
| Ver estoque atual | **Estoque → Aba "Prateleira Física"** |
| Registrar lote de produção | **Botão "Lançar Lote"** |
| Ver validades próximas | **Filtro "Controlar Validades"** |
| Ver histórico de movimentações | **Aba "Movimentações"** |
| Definir estoque mínimo | **Card do produto → Botão "Ajustar Mínimo"** |
| Filtrar produtos zerados | **Filtro "Esgotados/Zerados"** |

> Ao lançar um lote, o sistema **verifica automaticamente** se tem insumos na Despensa e consome os ingredientes.

---

## 👥 Clientes

**O que faz aqui:** Cadastro completo de clientes — lanchonetes, buffets, particulares etc.

| O que fazer | Onde clicar |
|---|---|
| Cadastrar novo cliente | **Clientes → Botão "Novo Cliente"** |
| Editar cliente | **Card do cliente → Botão "Editar"** |
| Excluir cliente | **Card do cliente → Botão "Excluir"** |
| Buscar cliente | **Campo de busca por nome, telefone ou endereço** |
| Filtrar por tipo | **Filtro de tipo de cliente** |

---

## 🍳 Pedidos / Produção

**O que faz aqui:** O coração do sistema. Criar pedidos, acompanhar a produção no Kanban, entregar e gerenciar estornos.

### Kanban (Quadro de Produção)

| O que fazer | Onde clicar |
|---|---|
| Criar novo pedido | **Pedidos → Botão "Novo Pedido"** |
| Mover pedido de status | **Arrastar cartão entre colunas** |
| Iniciar produção | **Cartão → Botão "Cozinha"** |
| Marcar como pronto | **Cartão → Botão "Pronto!"** |
| Registrar entrega | **Cartão → Botão "Entregar"** |
| Cancelar pedido | **Detalhes do pedido → Botão "Cancelar"** |
| Ver ficha completa | **Cartão → Botão "Ver Ficha"** |

### Detalhes do Pedido (Ficha)

| O que fazer | Onde clicar |
|---|---|
| Ver itens e valores | Modal de detalhes do pedido |
| Verificar estoque | **Botão "Analisar Estoque & Insumos"** |
| Ver pagamentos recebidos | Seção **"Pagamentos"** |
| Ir para o Caixa receber | Link **"Ir para o Caixa"** |
| Estornar valores | Se o pedido foi cancelado e tinha pagamento |

### Planejador Semanal

| O que fazer | Onde clicar |
|---|---|
| Ver carga de trabalho da semana | **Aba "Carga de Trabalho"** |

### Lista Geral

| O que fazer | Onde clicar |
|---|---|
| Buscar pedido por cliente ou código | **Aba "Lista Geral" → campo de busca** |
| Filtrar estornos pendentes | **Botão "⚠️ Estorno Pendente"** |

---

## 💰 Caixa Rápido

**O que faz aqui:** Receber pagamentos, registrar receitas e despesas avulsas, emitir comprovante.

| O que fazer | Onde clicar |
|---|---|
| Receber pagamento de pedido | **Caixa → Buscar pedido → "Receber"** |
| Registrar receita avulsa | **Botão "Receita Livre"** |
| Registrar despesa avulsa | **Botão "Despesa Rápida"** |
| Ver extrato do dia | Abaixo dos botões — lista do dia |
| Imprimir comprovante | Após receber → **Botão "Imprimir"** |
| Calcular troco | Ao selecionar **"Dinheiro"** → digita o valor pago |

---

## 📈 Financeiro

**O que faz aqui:** Visão completa de todas as receitas e despesas do sistema.

| O que fazer | Onde clicar |
|---|---|
| Ver lançamentos | Tela inicial do Financeiro |
| Filtrar receitas/despesas | **Filtro: "Todas / Receitas / Despesas"** |
| Registrar lançamento avulso | **Botão "Novo Lançamento"** |
| Excluir lançamento | **Botão "Excluir" na linha do lançamento** |

> Lançamentos de pedidos e compras são registrados **automaticamente** pelo Caixa e pela Despensa.

---

## 👤 Usuários (só Administrador)

**O que faz aqui:** Gerenciar quem acessa o sistema e o que cada um pode fazer.

| O que fazer | Onde clicar |
|---|---|
| Criar novo usuário | **Botão "Novo Usuário"** |
| Editar usuário | **Botão "Editar"** |
| Ativar/Desativar | **Botão "Ativar"/"Desativar"** |
| Excluir usuário | **Botão "Excluir"** |
| Redefinir senha | **Botão "Redefinir Senha"** |
| Ver código de recuperação | **Botão "Código de Recuperação"** |

---

## ⚙️ Configurações

| O que fazer | Onde clicar |
|---|---|
| Alterar nome do sistema | **Campo "Nome da Aplicação"** |

---

## 🔐 Fora do sistema (Tela de Login)

| O que fazer | Onde clicar |
|---|---|
| Entrar no sistema | **Login → Email + Senha → "Entrar"** |
| Criar primeiro admin | **"Criar primeiro administrador"** (se não houver nenhum) |
| Recuperar senha | **"Esqueci minha senha"** → digitar código de recuperação |

---

## 📌 Dicas Rápidas

- 🖥️ **Desktop:** Sidebar à esquerda com todas as páginas. Use arrastar no Kanban.
- 📱 **Celular:** Menu inferior (navbar) e drawer lateral. Toque para navegar.
- 🔄 **Offline:** Dados previamente carregados ficam disponíveis em cache, mas alterações exigem conexão com a internet.
- 🏷️ **Badge laranja "⚠️ Estorno Pendente":** Aparece em pedidos cancelados que ainda têm valores a devolver.
