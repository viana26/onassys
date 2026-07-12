# TASK_FEAT: Sistema de Ajuda Onassys

**Branch:** `main`
**Objetivo:** Botão "Ajuda!" na sidebar que dispara spotlight contextual (Driver.js) por módulo
**Estado:** Implementado e funcional

---

## Arquitetura Atual

### Componentes

| Arquivo | Função | Status |
|---------|--------|--------|
| `OnboardingChecklist.tsx` | Botão "Ajuda!" — dispara Driver.js spotlight por módulo | ✅ Ativo |
| `ContextualHelp.tsx` | Removido (função mesclada no OnboardingChecklist) | ❌ Deletado |
| `OnboardingTour.tsx` | Tour automático de boas-vindas (removido) | ❌ Deletado |
| `helpSteps.ts` | `moduleHelp[]` com spotlight por módulo; `welcomeTourSteps` removido | ✅ Ativo |
| `driver-overrides.css` | Estilos dark/light do Driver.js | ✅ Ativo |
| `index.ts` | Barrel exports (OnboardingChecklist, moduleHelp, getModuleHelp) | ✅ Ativo |

### Como funciona

1. **Botão "Ajuda!"** na sidebar (topo fixo) aceita `moduleId` como prop
2. Ao clicar, busca `getModuleHelp(moduleId)` em `helpSteps.ts`
3. Filtra steps cujos elementos existem no DOM (`document.querySelector`)
4. Dispara Driver.js spotlight com os passos encontrados
5. Funciona em dark/light mode via `overlayColor` dinâmico

### Sidebar (Desktop)

```
<aside> sticky, flex-col, h-screen
  └─ TOPO FIXO (não rola)
       ├─ Logo + empresa + perfil
       ├─ Divider
       └─ Botão "Ajuda!"
  └─ MEIO ROLÁVEL (flex-1 overflow-y-auto)
       └─ Menu de navegação
  └─ FUNDO FIXO
       ├─ Toggle tema
       ├─ Sync status
       └─ Sair
```

### Módulos com help

- Dashboard, Caixa, Estoque, Pedidos, Financeiro, Clientes, Produtos, Materiais, Relatórios, Fornecedores, Config, Usuários

### data-help attributes

- `data-help="dashboard"`, `data-help="caixa"`, `data-help="estoque"`, `data-help="pedidos"`, etc.
- `data-help="estoque-novo"`, `data-help="estoque-busca"`, `data-help="estoque-filtro"` (elementos internos)
- `data-help="pedidos-novo"`, `data-help="pedidos-kanban"`, `data-help="pedidos-lista"`
- `data-help="financeiro-novo"`, `data-help="financeiro-filtro"`
- `data-help="clientes-novo"`, `data-help="clientes-busca"`
- `data-help="produtos-novo"`, `data-help="produtos-ficha"`
- `data-help="materiais-novo"`, `data-help="materiais-mov"`
- `data-help="relatorios-card"`

### Dependências

- `driver.js` (~5KB)
- `lucide-react` (HelpCircle)
