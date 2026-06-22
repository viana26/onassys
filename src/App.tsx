import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MiniFactoryStore } from './lib/store';
import Dashboard from './components/Dashboard';
import Materiais from './components/Materiais';
import Produtos from './components/Produtos';
import EstoqueProdutos from './components/EstoqueProdutos';
import Clientes from './components/Clientes';
import Pedidos from './components/Pedidos';

import { 
  Beef, 
  ChefHat, 
  LayoutDashboard, 
  Coins, 
  Layers, 
  Warehouse, 
  Users, 
  ShoppingBag, 
  PlusCircle,
  Menu,
  X,
  Plus,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  // Global transactional store instance memoized (so we don't recreate it on renders)
  const store = useMemo(() => new MiniFactoryStore(), []);
  
  // Update listener to trigger re-renders
  const [updateTick, setUpdateTick] = useState(0);
  useEffect(() => {
    return store.subscribe(() => {
      setUpdateTick(prev => prev + 1);
    });
  }, [store]);

  // Theme selector state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Apply dark class to root document element dynamically
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Root Navigation Tabs Router state
  // Supported tabs: 'dashboard', 'materiais', 'produtos', 'estoque', 'clientes', 'pedidos'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Sidebar toggle state for intermediate tablet sizes
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // References to trigger specific quick-action modals across components
  const newOrderTriggerRef = useRef<{ trigger: () => void }>({ trigger: () => {} });
  const newLotTriggerRef = useRef<{ trigger: () => void }>({ trigger: () => {} });

  const handleQuickOrder = () => {
    setCurrentTab('pedidos');
    // Tick to ensure page loads previous changes, then trigger
    setTimeout(() => {
      if (newOrderTriggerRef.current.trigger) {
        newOrderTriggerRef.current.trigger();
      }
    }, 50);
  };

  const handleQuickLot = () => {
    setCurrentTab('estoque');
    // Tick to ensure page loads previous changes, then trigger
    setTimeout(() => {
      // In Estoque page, we can open the production lote form
      const lotButton = document.querySelector('[id="estoque-tab"] button') || document.querySelector('button:contains("Lançar Lote de Produção")');
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      document.querySelector('button[class*="bg-emerald-600"]')?.dispatchEvent(event);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex flex-col md:flex-row relative text-[#2e2315] dark:text-[#f7f4f0] transition-colors duration-200">
      
      {/* ---------------------------------------------------- */}
      {/* DESKTOP SIDEBAR */}
      {/* ---------------------------------------------------- */}
      <aside className="hidden md:flex flex-col md:w-56 lg:w-64 bg-[#f8f5ee] dark:bg-[#0c0703] text-[#2e2315] dark:text-amber-50 h-screen sticky top-0 flex-shrink-0 md:p-4 lg:p-5 justify-between border-r border-[#ebdcc9] dark:border-[#1e1005] transition-colors duration-200">
        <div className="space-y-6">
          {/* Logo Brand / Header */}
          <div className="flex items-center gap-2.5 lg:gap-3 pb-4 border-b border-[#ebdcc9] dark:border-[#1e1005]">
            <div className="bg-amber-600 p-1.5 lg:p-2 rounded-xl text-amber-950 shrink-0">
              <ChefHat size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-xs lg:text-sm tracking-tight leading-snug truncate">Mini Fábrica</h2>
              <p className="text-[8px] lg:text-[10px] text-amber-700 dark:text-amber-400 font-mono tracking-wider font-semibold truncate">ESTOQUE & PEDIDOS</p>
            </div>
          </div>

          {/* Nav menu links */}
          <nav className="space-y-1" id="desktop-nav">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
              { id: 'materiais', label: 'Despensa Insumos', icon: <Coins size={15} /> },
              { id: 'produtos', label: 'Fichas & Cardápio', icon: <Layers size={15} /> },
              { id: 'estoque', label: 'Estoque de Assados', icon: <Warehouse size={15} /> },
              { id: 'clientes', label: 'Clientes', icon: <Users size={15} /> },
              { id: 'pedidos', label: 'Pedidos / Cozinha', icon: <ShoppingBag size={15} /> },
            ].map(item => {
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 lg:gap-3 px-2.5 lg:px-3 py-2 lg:py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
                    active 
                      ? 'bg-amber-700 dark:bg-amber-600 text-white font-bold shadow-sm' 
                      : 'hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b] text-[#5c4a37] dark:text-amber-100/70'
                  }`}
                >
                  <div className="shrink-0">{item.icon}</div>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#ebdcc9] dark:border-[#1e1005]">
          {/* Dynamic Theme Selection Switch */}
          <div className="flex items-center justify-between bg-[#f0eade] dark:bg-[#130b04] p-1 rounded-xl border border-[#ebdcc9] dark:border-[#1e1005]">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition ${
                theme === 'light'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-[#5c4a37]/60 dark:text-amber-100/30 hover:text-[#5c4a37] dark:hover:text-amber-100/60'
              }`}
            >
              <Sun size={12} />
              <span>CLARO</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition ${
                theme === 'dark'
                  ? 'bg-amber-700 text-white shadow-sm'
                  : 'text-[#5c4a37]/60 dark:text-amber-100/30 hover:text-[#5c4a37] dark:hover:text-amber-100/60'
              }`}
            >
              <Moon size={12} />
              <span>ESCURO</span>
            </button>
          </div>

          {/* User Account / Context */}
          <div className="text-xs space-y-1 text-[#5c4a37]/60 dark:text-amber-100/40 font-mono">
            <p className="font-semibold text-amber-700 dark:text-amber-400 font-sans truncate">vianapessoal@gmail.com</p>
            <p className="text-[9px]">Sessão Administrador | V.1.0</p>
          </div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* MOBILE HEADER */}
      {/* ---------------------------------------------------- */}
      <header className="md:hidden bg-[#f8f5ee] dark:bg-[#0c0703] text-[#2e2315] dark:text-amber-100 p-4 border-b border-[#ebdcc9] dark:border-[#1e1005] flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 p-1.5 rounded-lg text-amber-950">
            <ChefHat size={16} />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#2e2315] dark:text-white">Mini Fábrica</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Quick Switcher for Mobile */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-lg bg-[#f0eade] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#1e1005] text-amber-700 dark:text-amber-400 hover:opacity-85 transition"
            title="Alternar Tema Claro/Escuro"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded font-bold font-mono border border-amber-200/40 dark:border-amber-950/20">
            ADMIN
          </p>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* MAIN VIEWPORT BODY */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 p-5 md:p-8 pb-20 md:pb-8 w-full max-w-7xl mx-auto overflow-x-hidden space-y-6">
        
        {/* Render Tab elements dynamically */}
        {currentTab === 'dashboard' && (
          <Dashboard 
            store={store} 
            onNavigate={setCurrentTab} 
            onSetQuickOrder={handleQuickOrder}
            onSetQuickLot={handleQuickLot}
          />
        )}
        
        {currentTab === 'materiais' && (
          <Materiais store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'produtos' && (
          <Produtos store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'estoque' && (
          <EstoqueProdutos store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'clientes' && (
          <Clientes store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'pedidos' && (
          <Pedidos 
            store={store} 
            onUpdate={() => setUpdateTick(t => t + 1)} 
            forceOpenNewOrderRef={newOrderTriggerRef}
          />
        )}

      </main>

      {/* ---------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ---------------------------------------------------- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f8f5ee] dark:bg-[#0c0703] border-t border-[#ebdcc9] dark:border-[#1e1005] text-[#2e2315] dark:text-amber-100 flex items-center justify-around py-2 px-1 z-40 shadow-xl navbar-mobile transition-colors duration-200">
        {[
          { id: 'dashboard', label: 'Monitor', icon: <LayoutDashboard size={18} /> },
          { id: 'materiais', label: 'Insumos', icon: <Coins size={18} /> },
          { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag size={18} /> },
          { id: 'estoque', label: 'Prateleira', icon: <Warehouse size={18} /> },
        ].map(item => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center gap-0.5 p-1 text-[10px] tracking-wide transition ${
                active ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-[#5c4a37]/60 dark:text-amber-100/50 hover:text-[#5c4a37]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Quick floating central ADD order buttons shortcut */}
        <button
          onClick={handleQuickOrder}
          id="btn-mobile-fab-add"
          className="bg-amber-600 hover:bg-amber-500 text-white p-2.5 rounded-full shadow-lg border-2 border-[#f8f5ee] dark:border-[#0c0703] -translate-y-4 transform transition-all active:scale-95"
        >
          <Plus size={18} />
        </button>
      </nav>

    </div>
  );
}
