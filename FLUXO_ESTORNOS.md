# Fluxo de Estornos e Reversão de Pedidos

## Como o estoque se comporta em cada etapa

```
Confirmado (2) → Produzindo (3) → Pronto (4) → Entregue (5)
     │                │               │             │
     │           (só status)    consome insumos   deduz
     │                          + gera estoque    estoque
     │
     └── Atender do Estoque ──→ Pronto (4)
          (pula produção, estoque já existia)
```

## Cancelar ou Voltar um Pedido

Quando você cancela ou volta um pedido, aparece um modal com opções.
As opções mudam conforme o status atual do pedido.

---

### Status 2 — Confirmado ou Status 3 — Produzindo

Nenhuma movimentação de estoque aconteceu ainda. O modal **não mostra checkboxes**.
Apenas confirma que você quer cancelar/voltar. Estoques não são afetados.

---

### Status 4 — Pronto

O pedido foi **produzido** (consumiu insumos + gerou estoque). Duas situações:

| Você marca? | Cenário | O que acontece |
|:---:|---|---|
| ✅ | **Erro do usuário** — marcou como Pronto mas não foi produzido fisicamente | Restaura insumos + remove estoque gerado. Pedido volta como se nunca tivesse sido produzido. |
| ❌ | **Produzido fisicamente** — as coxinhas estão lá, prontas, mas cliente desistiu | Mantém estoque e insumos como estão. O produto já foi feito, não tem como desfazer o cozimento. |

---

### Status 5 — Entregue

O pedido foi **produzido** E **entregue**. Três opções independentes:

#### ☑ Reverter produção

| Marcar? | Quando usar |
|:---:|---|
| ✅ | **Erro do usuário** — nunca foi produzido de verdade, só avançaram os status por engano. Restaura insumos + remove estoque gerado (como se a produção nunca tivesse ocorrido). |
| ❌ | **Produzido fisicamente** — os insumos viraram produto, não tem como "descozinhar". O que foi feito, está feito. |

#### ☑ Repor produtos entregues

| Marcar? | Quando usar |
|:---:|---|
| ✅ | **Cliente devolveu** o produto fisicamente. Ex: coxinhas voltaram porque estavam frias, cliente arrependeu. Os produtos voltam ao estoque disponível. |
| ❌ | **Produto foi consumido/extraviado** — cliente comeu, festa acabou, produto estragou. Não tem o que repor no estoque. |
| ❌ | **Cliente não devolveu** — simplesmente não trouxe de volta. |

#### ☑ Estornar pagamentos

| Marcar? | Quando usar |
|:---:|---|
| ✅ | **Vai reembolsar o cliente** — o dinheiro precisa sair do caixa. Cria lançamentos de despesa como "Estorno". |
| ❌ | **Não vai reembolsar** — cliente aceitou crédito na loja, ou o serviço foi prestado de outra forma, ou o pedido era cortesia. Mantém o dinheiro no caixa. |

---

## Exemplos práticos — Status 5

| Situação | Reverter produção | Repor entrega | Estornar |
|---|---|---|---|
| ❌ Erro: usuário marcou tudo por engano, nada foi feito fisicamente | ✅ | ✅ | ✅ |
| 🍗 Produziu, entregou, cliente devolveu tudo e quer dinheiro de volta | ❌ (já foi cozido) | ✅ | ✅ |
| 🍗 Produziu, entregou, cliente não devolveu nada, só cancelar registro | ❌ | ❌ | ❌ (ou depende) |
| 🍗 Produziu, entregou, produto estragou na entrega, cliente não pagou | ❌ | ❌ | ❌ (não tem receita) |
| 🍗 Produziu, entregou, cliente devolveu mas quer crédito na loja | ❌ | ✅ | ❌ |

---

## Drag-and-drop no Kanban

- **Arrastar para frente** (ex: 2→3, 3→4, 4→5): permitido apenas entre colunas adjacentes
- **Arrastar para trás** (ex: 3→2, 4→3, 5→4): abre o modal de reversão
- **Pular coluna para frente** (ex: 2→4, 3→5): bloqueado — use os botões no painel de detalhes
- **Pular coluna para trás** (ex: 4→2, 5→3): bloqueado — volte uma etapa por vez

## Excluir Pedido

Antes de excluir, o sistema automaticamente reverte **todas** as movimentações de estoque do pedido (insumos, geração, entrega) para não deixar inconsistências.
