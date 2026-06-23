import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MiniFactoryStore } from './lib/store';
import Dashboard from './components/Dashboard';
import Materiais from './components/Materiais';
import Produtos from './components/Produtos';
import EstoqueProdutos from './components/EstoqueProdutos';
import Clientes from './components/Clientes';
import Pedidos from './components/Pedidos';
import SetupInstructions from './components/SetupInstructions';
import Login from './components/Login';
import AddAdmin from './components/AddAdmin';
import Usuarios from './components/Usuarios';
import DataMigrator from './components/DataMigrator';
import { 
    isSupabaseConfigured, 
    verificarAdminExiste,
    onAuthStateChange, 
    signOut,
    supabase,
    checkDatabaseEmpty 
} from './lib/supabaseClient';
import { User } from '@supabase/supabase-js';

import { 
  Beef, 
  ChefHat, 
  LayoutDashboard, 
  Coins, 
  Layers, 
  Warehouse, 
  Users, 
  ShoppingBag, 
  Shield,
  PlusCircle,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';

type AuthScreen = 'loading' | 'setup' | 'add-admin' | 'login' | 'sync' | 'app';

export default function App() {
  // =====================================================
  // AUTH STATE (all hooks at top)
  // =====================================================
  const [authScreen, setAuthScreen] = useState<AuthScreen>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // =====================================================
  // STORE AND APP STATE (only mounted when authenticated)
  // =====================================================
  const [store, setStore] = useState<MiniFactoryStore | null>(null);
  const [updateTick, setUpdateTick] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const newOrderTriggerRef = useRef<{ trigger: () => void }>({ trigger: () => {} });
  const newLotTriggerRef = useRef<{ trigger: () => void }>({ trigger: () => {} });

  // =====================================================
  // EFFECTS - Auth
  // =====================================================
  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        setAuthScreen('setup');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setCurrentUser(session.user);
          setAuthScreen('sync');
        } else {
          const adminExiste = await verificarAdminExiste();
          setAuthScreen(adminExiste ? 'login' : 'add-admin');
        }
      } catch {
        setAuthScreen('setup');
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthScreen('sync');
      } else {
        setCurrentUser(null);
        setStore(null);
        const adminExiste = await verificarAdminExiste();
        setAuthScreen(adminExiste ? 'login' : 'add-admin');
      }
    });

    return () => unsubscribe();
  }, []);

  // =====================================================
  // EFFECTS - Store initialization
  // =====================================================
  useEffect(() => {
    if (authScreen === 'app') {
      const miniStore = new MiniFactoryStore();
      setStore(miniStore);
      
      const unsubscribe = miniStore.subscribe(() => {
        setUpdateTick(prev => prev + 1);
      });
      
      return () => unsubscribe();
    }
  }, [authScreen]);

  // =====================================================
  // EFFECTS - Theme
  // =====================================================
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') setTheme(saved);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleLoginSuccess = () => {
    setAuthScreen('app');
  };

  const handleAddAdminSuccess = () => {
    setAuthScreen('login');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setStore(null);
    setAuthScreen('login');
  };

  const handleQuickOrder = () => {
    setCurrentTab('pedidos');
    setTimeout(() => {
      if (newOrderTriggerRef.current.trigger) {
        newOrderTriggerRef.current.trigger();
      }
    }, 50);
  };

  const handleQuickLot = () => {
    setCurrentTab('estoque');
    setTimeout(() => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      document.querySelector('button[class*="bg-emerald-600"]')?.dispatchEvent(event);
    }, 50);
  };

  // =====================================================
  // RENDER - Early returns AFTER all hooks
  // =====================================================
  if (authScreen === 'loading') {
    return (
      <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center">
        <div className="animate-pulse text-[#5c4a37] dark:text-amber-100/60">Carregando...</div>
      </div>
    );
  }

  if (authScreen === 'setup') {
    return <SetupInstructions />;
  }

  if (authScreen === 'add-admin') {
    return (
      <AddAdmin 
        onSuccess={handleAddAdminSuccess} 
        onBack={() => setAuthScreen('login')} 
      />
    );
  }

  if (authScreen === 'login') {
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onNavigateToAddAdmin={() => setAuthScreen('add-admin')} 
      />
    );
  }

  if (authScreen === 'sync') {
    return (
      <DataMigrator onComplete={() => setAuthScreen('app')} />
    );
  }

  // =====================================================
  // APP PRINCIPAL
  // =====================================================
  if (!store) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex items-center justify-center">
        <div className="animate-pulse text-[#5c4a37] dark:text-amber-100/60">Inicializando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] dark:bg-[#0c0703] flex flex-col md:flex-row relative text-[#2e2315] dark:text-[#f7f4f0] transition-colors duration-200">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col md:w-56 lg:w-64 bg-[#f8f5ee] dark:bg-[#0c0703] text-[#2e2315] dark:text-amber-50 h-screen sticky top-0 flex-shrink-0 md:p-4 lg:p-5 justify-between border-r border-[#ebdcc9] dark:border-[#1e1005] transition-colors duration-200">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 lg:gap-3 pb-4 border-b border-[#ebdcc9] dark:border-[#1e1005]">
            <div className="bg-amber-600 p-1.5 lg:p-2 rounded-xl text-amber-950 shrink-0">
              <ChefHat size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-xs lg:text-sm tracking-tight leading-snug truncate">Mini Fábrica</h2>
              <p className="text-[8px] lg:text-[10px] text-amber-700 dark:text-amber-400 font-mono tracking-wider font-semibold truncate">ESTOQUE & PEDIDOS</p>
            </div>
          </div>

          <nav className="space-y-1" id="desktop-nav">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
              { id: 'materiais', label: 'Despensa Insumos', icon: <Coins size={15} /> },
              { id: 'produtos', label: 'Fichas & Cardápio', icon: <Layers size={15} /> },
              { id: 'estoque', label: 'Estoque de Assados', icon: <Warehouse size={15} /> },
              { id: 'clientes', label: 'Clientes', icon: <Users size={15} /> },
              { id: 'pedidos', label: 'Pedidos / Cozinha', icon: <ShoppingBag size={15} /> },
              { id: 'usuarios', label: 'Usuários', icon: <Shield size={15} /> },
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

          <div className="text-xs space-y-2">
            <div className="text-[#5c4a37]/60 dark:text-amber-100/40 font-mono">
              <p className="font-semibold text-amber-700 dark:text-amber-400 font-sans truncate">
                {currentUser?.email || 'Usuário'}
              </p>
              <p className="text-[9px]">Administrador | V.1.0</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[10px] font-medium text-[#5c4a37]/60 dark:text-amber-100/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              <LogOut size={12} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-[#f8f5ee] dark:bg-[#0c0703] text-[#2e2315] dark:text-amber-100 p-4 border-b border-[#ebdcc9] dark:border-[#1e1005] flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 p-1.5 rounded-lg text-amber-950">
            <ChefHat size={16} />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#2e2315] dark:text-white">Mini Fábrica</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-lg bg-[#f0eade] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#1e1005] text-amber-700 dark:text-amber-400 hover:opacity-85 transition"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded font-bold font-mono border border-amber-200/40 dark:border-amber-950/20">
            ADMIN
          </p>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 p-5 md:p-8 pb-20 md:pb-8 w-full max-w-7xl mx-auto overflow-x-hidden space-y-6">
        
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

        {currentTab === 'usuarios' && (
          <Usuarios />
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
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