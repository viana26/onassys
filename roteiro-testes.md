# Roteiro de Testes — Novas Mudanças no Sistema

Olá! Fizemos várias melhorias na tela de **Produtos**. Pedimos que vocês testem esses cenários e avisem se encontrar algo estranho.

---

## O que mudou?

### 1. Formulário de Produto agora é JANELA CENTRAL (não mais lateral)
- Antes: abria uma gaveta na lateral direita.
- Agora: abre uma janela no **centro da tela** (no celular sobe de baixo).
- ⚠️ Testar: clicar em "+ Novo Produto" e em "Editar" em um produto existente.

### 2. Abas do formulário
- **Aba 1 — "Informações Básicas de Venda"**: nome, categoria, unidade, tempo, status, descrição, foto e preço tudo junto.
- **Aba 2 — "Composição da Receita (Ingredientes)"**: lista de ingredientes da receita.
- ⚠️ Testar: alternar entre as abas, preencher dados, voltar.

### 3. Foto + Descrição lado a lado
- Agora a **foto** (30%) e a **descrição** (70%) ficam na mesma linha.
- O container da foto tem borda igual aos campos de texto.
- ⚠️ Testar: escolher uma foto, ver preview, apagar foto, digitar descrição.

### 4. Grid de Produtos (lista principal)
- **Desktop (computador)**: tabela com colunas: Produto | Prep | Custo | Preço | Cap. | Ações.
- **Celular**: cards empilhados com as mesmas informações + acordeão "Ficha Técnica" para ver ingredientes e simular produção.
- ⚠️ Testar: redimensionar a tela para ver a mudança entre tabela e cards.

### 5. Campos mais compactos
- Tempo (min) com largura fixa para não invadir o botão "+ Nova" unidade.
- Layout da Unidade + Tempo + Status em flex em vez de grid.

### 6. Paginação
- Padrão: **6 itens por página** (era 5). Dá para escolher 6, 10, 20 ou 50.

### 7. Popup "Nova Unidade de Medida"
- Continua abrindo centralizado na tela (não mudou).

---

## O que testar especificamente

| Teste | Como fazer |
|---|---|
| Abrir cadastro | Clicar em "+ Novo Produto & Ficha Técnica" |
| Abrir edição | Clicar no lápis/editar em um produto |
| Preencher formulário | Digitar nome, escolher categoria, unidade, tempo |
| Escolher foto | Clicar em "Escolher Foto" e selecionar uma imagem |
| Ver preview da foto | A imagem deve aparecer no quadrado |
| Remover foto | Clicar no X em cima da foto |
| Digitar descrição | Escrever na caixa de texto ao lado da foto |
| Aba de ingredientes | Clicar na aba "2. Composição da Receita" |
| Adicionar ingrediente | Clicar em "Adicionar" e selecionar material |
| Alternar abas | Clicar de volta na aba 1 e ver se os dados estão lá |
| Salvar produto | Preencher tudo e clicar em "Confirmar Cadastro" |
| Grid no PC | Ver se aparece tabela com colunas |
| Grid no celular | Ver se aparece cards com acordeão |
| Paginação | Ver se mostra 6 itens por página, testar 10, 20, 50 |
| Popup unidade | Clicar em "+ Nova" ao lado do campo Unidade |

---

## Comparação com a versão anterior

| Antes | Agora |
|---|---|
| Formulário em gaveta lateral direita | Formulário em janela central |
| 3 abas (Dados, Foto & Preço, Ficha Técnica) | 2 abas (Informações Básicas, Ingredientes) |
| Foto em linha separada | Foto + Descrição lado a lado (30%/70%) |
| Cards em grid de 3 colunas no PC | Tabela no PC, Cards no celular |
| Tempo ocupava largura total | Tempo com largura fixa |
| Grid de métricas em 2 colunas | Grid de métricas em flex (4 itens lado a lado) |
| Paginação padrão 5 itens | Paginação padrão 6 itens |

---

Qualquer comportamento estranho (formulário não abrir, foto não aparecer, grid quebrado, etc.) é só reportar!
