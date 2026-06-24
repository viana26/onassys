import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MiniFactoryStore } from './lib/store';
import Dashboard from './components/Dashboard';
import Materiais from './components/Materiais';
import Produtos from './components/Produtos';
import EstoqueProdutos from './components/EstoqueProdutos';
import Clientes from './components/Clientes';
import Pedidos from './components/Pedidos';
import Caixa from './components/Caixa';
import SetupInstructions from './components/SetupInstructions';
import Login from './components/Login';
import AddAdmin from './components/AddAdmin';
import Usuarios from './components/Usuarios';
import Financeiro from './components/Financeiro';
import Configuracao from './components/Configuracao';
import SyncStatus from './components/SyncStatus';
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
  ChefHat, 
  LayoutDashboard, 
  Coins, 
  Layers, 
  Warehouse, 
  Users, 
  ShoppingBag, 
  Shield,
  DollarSign,
  Wallet,
  Settings,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';

type AuthScreen = 'loading' | 'setup' | 'add-admin' | 'login' | 'app';

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
  const [appName, setAppName] = useState(() => localStorage.getItem('appName') || 'Mini Fábrica');
  const [currentTab, setCurrentTab] = useState<string>(() => localStorage.getItem('currentTab') || 'dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [caixaPreselectedId, setCaixaPreselectedId] = useState<string | null>(null);
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
          setAuthScreen('app');
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
        setAuthScreen('app');
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

  useEffect(() => {
    localStorage.setItem('currentTab', currentTab);
  }, [currentTab]);

  // =====================================================
  // HANDLERS
  // =====================================================
  const handleLoginSuccess = () => {
    setAuthScreen('app');
  };

  const handleAddAdminSuccess = () => {
    setAuthScreen('login');
  };

  const handleSaveAppName = (name: string) => {
    setAppName(name);
    localStorage.setItem('appName', name);
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

  const handleGoToCaixa = (pedidoId?: string) => {
    if (pedidoId) setCaixaPreselectedId(pedidoId);
    setCurrentTab('caixa');
    setIsSidebarOpen(false);
    setIsMobileMenuOpen(false);
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
              <h2 className="font-display font-semibold text-xs lg:text-sm tracking-tight leading-snug truncate">{appName}</h2>
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
              { id: 'caixa', label: 'Caixa Rápido', icon: <Wallet size={15} /> },
              { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={15} /> },
              { id: 'usuarios', label: 'Usuários', icon: <Shield size={15} /> },
              { id: 'config', label: 'Configurações', icon: <Settings size={15} /> },
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

          <SyncStatus store={store} />

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
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 -ml-1 rounded-lg hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b] transition"
          >
            <Menu size={18} />
          </button>
          <div className="bg-amber-600 p-1.5 rounded-lg text-amber-950">
            <ChefHat size={16} />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#2e2315] dark:text-white">{appName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-lg bg-[#f0eade] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#1e1005] text-amber-700 dark:text-amber-400 hover:opacity-85 transition"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#f8f5ee] dark:bg-[#0c0703] shadow-2xl border-r border-[#ebdcc9] dark:border-[#1e1005] p-5 animate-in slide-in-from-left-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ebdcc9] dark:border-[#1e1005]">
              <div className="flex items-center gap-2">
                <div className="bg-amber-600 p-1.5 rounded-lg text-amber-950">
                  <ChefHat size={16} />
                </div>
                <span className="font-display font-bold text-sm text-[#2e2315] dark:text-white">{appName}</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-amber-950 p-1">
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'caixa', label: 'Caixa Rápido', icon: <Wallet size={16} /> },
                { id: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={16} /> },
                { id: 'produtos', label: 'Fichas & Cardápio', icon: <Layers size={16} /> },
                { id: 'usuarios', label: 'Usuários', icon: <Shield size={16} /> },
                { id: 'config', label: 'Configurações', icon: <Settings size={16} /> },
              ].map(item => {
                const active = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition ${
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

            <div className="mt-6 pt-4 border-t border-[#ebdcc9] dark:border-[#1e1005]">
              <div className="text-xs text-[#5c4a37]/60 dark:text-amber-100/40 font-mono mb-3">
                <p className="font-semibold text-amber-700 dark:text-amber-400 font-sans truncate">
                  {currentUser?.email || 'Usuário'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-[#5c4a37]/60 dark:text-amber-100/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
              >
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 p-5 md:p-8 pb-20 md:pb-8 w-full max-w-7xl mx-auto overflow-x-hidden space-y-6 relative">
        
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
            onNavigateToCaixa={handleGoToCaixa}
          />
        )}

        {currentTab === 'caixa' && (
          <Caixa
            store={store}
            onUpdate={() => setUpdateTick(t => t + 1)}
            preselectedPedidoId={caixaPreselectedId || undefined}
            onClearPreselected={() => setCaixaPreselectedId(null)}
            appName={appName}
          />
        )}

        {currentTab === 'financeiro' && (
          <Financeiro store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'config' && (
          <Configuracao appName={appName} onSaveAppName={handleSaveAppName} />
        )}

        {currentTab === 'usuarios' && (
          <Usuarios store={store} />
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