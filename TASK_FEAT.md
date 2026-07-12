# TASK_FEAT: Sistema de Ajuda Onassys

**Branch:** `feat/sistema-de-ajuda`
**Objetivo:** Help contextual + Tour de boas-vindas (tudo via Driver.js)
**Regra:** Cada tarefa que compilar sem erro = commit local. Se falhar, corrigir antes de seguir.
**Nota:** @tourkit/react não existe no npm. Driver.js suporta tanto spotlight contextual quanto tours multi-step.

---

## Status Geral

| Fase | Tarefa | Status | Commit |
|------|--------|--------|--------|
| 1 | Criar branch | ✅ OK | `feat/sistema-de-ajuda` |
| 2 | Instalar dependências | ✅ OK | `npm install driver.js` |
| 3 | Criar helpSteps.ts | ✅ OK | `edb1e35` |
| 4 | Criar ContextualHelp.tsx | ✅ OK | `edb1e35` |
| 5 | Criar OnboardingTour.tsx | ✅ OK | `edb1e35` |
| 6 | Criar OnboardingChecklist.tsx | ✅ OK | `edb1e35` + `5fc28fa` |
| 7 | Criar driver-overrides.css | ✅ OK | `edb1e35` |
| 8 | Integrar no App.tsx | ✅ OK | `edb1e35` |
| 9 | Compilar e testar | ✅ OK | 0 erros |
| 10 | Commit final | ✅ OK | `5fc28fa` |

---

## Fase 2: Instalar dependências

```bash
npm install driver.js @tourkit/react
```

**Verificar:** `node_modules/driver.js` e `node_modules/@tourkit/react` existem.

---

## Fase 3: Criar `src/components/Help/helpSteps.ts`

Arquivo de configuração com os passos do tour por módulo.

### Conteúdo esperado:

```typescript
export interface HelpStep {
  element: string;       // CSS selector do elemento
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
  };
}

export interface ModuleHelp {
  moduleId: string;
  steps: HelpStep[];
}

// Tour de boas-vindas (primeira visita)
export const welcomeTourSteps: HelpStep[] = [
  { element: '[data-help="sidebar"]', popover: { title: 'Menu Principal', description: 'Acesse todos os módulos do sistema aqui.' } },
  { element: '[data-help="estoque"]', popover: { title: 'Estoque', description: 'Gerencie seus produtos acabados e matérias-primas.' } },
  // ... mais 3-4 passos
];

// Help contextual por módulo
export const moduleHelp: ModuleHelp[] = [
  {
    moduleId: 'estoque',
    steps: [
      { element: '[data-help="estoque-novo"]', popover: { title: 'Novo Produto', description: 'Clique para adicionar um produto ao estoque.' } },
      // ...
    ]
  },
  // ... mais módulos
];
```

**Verificar:** Arquivo existe e exporta os tipos corretos.

---

## Fase 4: Criar `src/components/Help/ContextualHelp.tsx`

Wrapper do Driver.js para help contextual.

### Funcionalidade:
- Botão `?` que ao clicar abre o spotlight no módulo atual
- Recebe `moduleId` como prop para buscar os steps corretos
- Usa Driver.js com configuração customizada
- Estilo escuro/claro via Tailwind
- Botão com ícone `HelpCircle` do lucide-react

### Props:
```typescript
interface ContextualHelpProps {
  moduleId: string;
}
```

### Configuração Driver.js:
```typescript
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const d = driver({
  showProgress: true,
  animate: true,
  overlayColor: 'rgba(0, 0, 0, 0.7)',
  popoverClass: 'help-popover',
  steps: [...] // do helpSteps.ts
});
```

**Verificar:** Componente renderiza sem erro, botão `?` visível.

---

## Fase 5: Criar `src/components/Help/OnboardingTour.tsx`

Tour de boas-vindas com @tourkit/react.

### Funcionalidade:
- Exibido apenas na primeira visita (localStorage flag)
- 5-6 passos pelos módulos principais
- Botões: Próximo, Pular, Finalizar
- Salva completion no localStorage

### Lógica:
```typescript
const [showTour, setShowTour] = useState(false);

useEffect(() => {
  const completed = localStorage.getItem('onassys_tour_completed');
  if (!completed) setShowTour(true);
}, []);

const completeTour = () => {
  localStorage.setItem('onassys_tour_completed', 'true');
  setShowTour(false);
};
```

**Verificar:** Tour aparece na primeira visita, some após completar.

---

## Fase 6: Criar `src/components/Help/OnboardingChecklist.tsx`

Checklist de progresso do onboarding.

### Funcionalidade:
- Mostra 4-5 tarefas iniciais (criar produto, registrar material, etc.)
- Cada tarefa tem uma checagem no store (ex: `store.produtos.length > 0`)
- Salva progresso no localStorage
- Visual: card lateral ou dropdown

### Tarefas:
1. ✅ Cadastrar primeiro produto
2. ✅ Adicionar material ao estoque
3. ✅ Criar ficha técnica
4. ✅ Registrar primeiro pedido
5. ✅ Ver primeiro relatório

**Verificar:** Checklist aparece, progresso atualiza corretamente.

---

## Fase 7: Criar `src/components/Help/driver-overrides.css`

Overrides CSS para o Driver.js popover.

### Conteúdo:
```css
/* Popover customizado com Tailwind-like styling */
.driver-popover {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  padding: 16px;
}

/* Dark mode */
.dark .driver-popover {
  background: #1c140c;
  border: 1px solid #2d1e0d;
}

/* Botões */
.driver-btn {
  background: #d97706;
  color: white;
  border-radius: 8px;
  padding: 6px 16px;
}
```

**Verificar:** Popover estilizado corretamente em light e dark mode.

---

## Fase 8: Integrar no App.tsx

### Mudanças:
1. Importar `ContextualHelp` e `OnboardingTour`
2. Adicionar botão `?` no header ao lado do `SyncStatus`
3. Adicionar `<OnboardingTour />` após o store ser carregado
4. Adicionar `data-help` attributes nos elementos principais da sidebar

### Exemplo no header:
```tsx
<div className="flex items-center gap-2">
  <ContextualHelp moduleId={currentTab} />
  <SyncStatus store={store} />
</div>
```

### data-help attributes na sidebar:
```tsx
<button data-help="estoque" onClick={...}>Estoque</button>
<button data-help="pedidos" onClick={...}>Pedidos</button>
// etc.
```

**Verificar:** Botão `?` aparece, tour inicia, sidebar tem data-help.

---

## Fase 9: Compilar e testar

```bash
npx tsc --noEmit
```

Se erro → corrigir → repetir Fase 9 até 0 erros.

---

## Fase 10: Commit final

```bash
git add .
git commit -m "feat: sistema de ajuda - help contextual e tour de boas-vindas"
```

---

## Instruções de Retomada

Se o PC desligar ou algo falhar:
1. Verificar este arquivo para ver qual fase parou
2. Executar a fase pendente
3. Compilar (`npx tsc --noEmit`)
4. Se OK → commitar e seguir para próxima fase
5. Se erro → corrigir, compilar novamente, commitar
