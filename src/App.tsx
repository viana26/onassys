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
  LogOut,
  Key,
  Copy
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
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [recoveryCodeValue, setRecoveryCodeValue] = useState('');
  const [recoveryCopied, setRecoveryCopied] = useState(false);
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

  useEffect(() => {
    if (store && currentUser) {
      const nome = currentUser.user_metadata?.nome || currentUser.email || 'Usuário';
      store.ensureUserProfile(currentUser.id, nome);
    }
  }, [store, currentUser]);

  // Mostrar código de recuperação no primeiro login
  useEffect(() => {
    if (!store || !currentUser) return;
    let cancelled = false;
    const checkCode = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const { data: perfil, error } = await supabase
          .from('perfis_usuario')
          .select('recovery_code_shown')
          .eq('id', currentUser.id)
          .maybeSingle();
        if (cancelled || error || !perfil || perfil.recovery_code_shown) return;
        const { data: code, error: rpcError } = await supabase.rpc('gerar_codigo_recovery_usuario', { p_user_id: currentUser.id });
        if (cancelled || rpcError || !code) return;
        await supabase.from('perfis_usuario').update({ recovery_code_shown: true }).eq('id', currentUser.id);
        setRecoveryCodeValue(code);
        setShowRecoveryCode(true);
      } catch {
        // coluna ou RPC ainda não existem no banco — ignora
      }
    };
    const timer = setTimeout(checkCode, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [store, currentUser]);

  // =====================================================
  // EFFECTS - Sync app name to browser tab
  // =====================================================
  useEffect(() => {
    document.title = appName;
  }, [appName]);

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
    setCurrentTab('dashboard');
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
      <aside className="hidden md:flex flex-col md:w-56 lg:w-64 bg-[#f8f5ee] dark:bg-[#0c0703] text-[#2e2315] dark:text-amber-50 h-screen sticky top-0 flex-shrink-0 md:p-4 lg:p-5 border-r border-[#ebdcc9] dark:border-[#1e1005] transition-colors duration-200">
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0 no-scrollbar">
            <div className="flex items-center gap-2.5 lg:gap-3">
              <div className="bg-amber-600 p-1.5 lg:p-2 rounded-xl text-amber-950 shrink-0">
                <ChefHat size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-xs lg:text-sm tracking-tight leading-snug truncate">{appName}</h2>
                <p className="text-[8px] lg:text-[10px] text-amber-700 dark:text-amber-400 font-mono tracking-wider font-semibold truncate">ESTOQUE & PEDIDOS</p>
              </div>
            </div>

            <div className="space-y-0.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
                <Shield size={12} /> {store.perfilNome(store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id ?? 3)}: {store.perfisUsuarios.find(u => u.id === store.currentUserId)?.nome || currentUser?.user_metadata?.nome || 'Usuário'}
              </span>
              <p className="text-[10px] text-[#5c4a37]/60 dark:text-amber-100/40 font-mono truncate leading-tight">
                {currentUser?.email || ''}
              </p>
            </div>

            <div className="border-b border-[#ebdcc9] dark:border-[#1e1005]"></div>

            <nav className="space-y-1" id="desktop-nav">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, perm: null },
                { id: 'materiais', label: 'Despensa Insumos', icon: <Coins size={15} />, perm: 'materiais.ver' },
                { id: 'produtos', label: 'Fichas & Cardápio', icon: <Layers size={15} />, perm: 'produtos.ver' },
                { id: 'estoque', label: 'Estoque de Assados', icon: <Warehouse size={15} />, perm: 'estoque.ver' },
                { id: 'clientes', label: 'Clientes', icon: <Users size={15} />, perm: 'clientes.ver' },
                { id: 'pedidos', label: 'Pedidos / Cozinha', icon: <ShoppingBag size={15} />, perm: 'pedidos.ver' },
                { id: 'caixa', label: 'Caixa Rápido', icon: <Wallet size={15} />, perm: 'financeiro.ver' },
                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={15} />, perm: 'financeiro.ver' },
                { id: 'usuarios', label: 'Usuários', icon: <Shield size={15} />, perm: 'usuarios.ver' },
                { id: 'config', label: 'Configurações', icon: <Settings size={15} />, perm: 'config.editar' },
              ].filter(item => {
                if (item.id === 'usuarios') {
                  return store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id === 1;
                }
                return !item.perm || store.hasPermission(item.perm);
              }).map(item => {
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

          <div className="space-y-3 pt-4 border-t border-[#ebdcc9] dark:border-[#1e1005] mt-auto">
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

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-semibold text-[#5c4a37]/60 dark:text-amber-100/40 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-transparent hover:border-red-200 dark:hover:border-red-800 transition"
            >
              <LogOut size={14} />
              <span>Sair</span>
            </button>
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
                { id: 'caixa', label: 'Caixa Rápido', icon: <Wallet size={16} />, perm: 'financeiro.ver' },
                { id: 'clientes', label: 'Clientes', icon: <Users size={16} />, perm: 'clientes.ver' },
                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={16} />, perm: 'financeiro.ver' },
                { id: 'produtos', label: 'Fichas & Cardápio', icon: <Layers size={16} />, perm: 'produtos.ver' },
                { id: 'usuarios', label: 'Usuários', icon: <Shield size={16} />, perm: 'usuarios.ver' },
                { id: 'config', label: 'Configurações', icon: <Settings size={16} />, perm: 'config.editar' },
              ].filter(item => {
                if (item.id === 'usuarios') {
                  return store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id === 1;
                }
                return !item.perm || store.hasPermission(item.perm);
              }).map(item => {
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
        
        {currentTab === 'materiais' && store.hasPermission('materiais.ver') && (
          <Materiais store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'produtos' && store.hasPermission('produtos.ver') && (
          <Produtos store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'estoque' && store.hasPermission('estoque.ver') && (
          <EstoqueProdutos store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'clientes' && store.hasPermission('clientes.ver') && (
          <Clientes store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'pedidos' && store.hasPermission('pedidos.ver') && (
          <Pedidos 
            store={store} 
            onUpdate={() => setUpdateTick(t => t + 1)} 
            forceOpenNewOrderRef={newOrderTriggerRef}
            onNavigateToCaixa={handleGoToCaixa}
          />
        )}

        {currentTab === 'caixa' && store.hasPermission('financeiro.ver') && (
          <Caixa
            store={store}
            onUpdate={() => setUpdateTick(t => t + 1)}
            preselectedPedidoId={caixaPreselectedId || undefined}
            onClearPreselected={() => setCaixaPreselectedId(null)}
            appName={appName}
          />
        )}

        {currentTab === 'financeiro' && store.hasPermission('financeiro.ver') && (
          <Financeiro store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
        )}

        {currentTab === 'config' && store.hasPermission('config.editar') && (
          <Configuracao appName={appName} onSaveAppName={handleSaveAppName} />
        )}

        {currentTab === 'usuarios' && store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id === 1 && (
          <Usuarios store={store} />
        )}

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#f8f5ee] dark:bg-[#0c0703] border-t border-[#ebdcc9] dark:border-[#1e1005] text-[#2e2315] dark:text-amber-100 flex items-center justify-around py-2 px-1 z-40 shadow-xl navbar-mobile transition-colors duration-200">
        {[
          { id: 'dashboard', label: 'Monitor', icon: <LayoutDashboard size={18} />, perm: null },
          { id: 'materiais', label: 'Insumos', icon: <Coins size={18} />, perm: 'materiais.ver' },
          { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag size={18} />, perm: 'pedidos.ver' },
          { id: 'estoque', label: 'Prateleira', icon: <Warehouse size={18} />, perm: 'estoque.ver' },
        ].filter(item => !item.perm || store.hasPermission(item.perm)).map(item => {
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

      {showRecoveryCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-[#1a1208] rounded-2xl max-w-sm w-full p-6 border border-[#ebdcc9] dark:border-[#2e1a0a] text-center shadow-2xl">
            <div className="bg-amber-100 dark:bg-amber-900/30 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3">
              <Key size={28} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-[#2e2315] dark:text-amber-50 mb-1">
              Seu Código de Recuperação
            </h2>
            <p className="text-xs text-[#5c4a37]/70 dark:text-amber-100/60 mb-4">
              Guarde este código em local seguro. Ele permite redefinir sua senha sem precisar do administrador.
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Código de Recuperação
              </span>
              <div className="bg-white dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#2e1a0a] rounded-lg px-4 py-3 mt-2">
                <span className="text-2xl font-bold tracking-[0.3em] text-[#2e2315] dark:text-amber-50 font-mono select-all">
                  {recoveryCodeValue}
                </span>
              </div>
              <button
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(recoveryCodeValue);
                  } catch {
                    const ta = document.createElement('textarea');
                    ta.value = recoveryCodeValue;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }
                  setRecoveryCopied(true);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-600 transition"
              >
                <Copy size={12} /> {recoveryCopied ? 'Copiado!' : 'Copiar código'}
              </button>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
              <p className="text-xs text-red-700 dark:text-red-300">
                ⚠️ Este código não é sua senha. É uma chave de recuperação exibida apenas uma vez. Se perder, peça ao administrador para gerar um novo.
              </p>
            </div>
            <button onClick={() => {
              setShowRecoveryCode(false);
              setRecoveryCopied(false);
              const firstTab = [
                { id: 'dashboard', perm: null },
                { id: 'materiais', perm: 'materiais.ver' },
                { id: 'produtos', perm: 'produtos.ver' },
                { id: 'estoque', perm: 'estoque.ver' },
                { id: 'clientes', perm: 'clientes.ver' },
                { id: 'pedidos', perm: 'pedidos.ver' },
                { id: 'caixa', perm: 'financeiro.ver' },
                { id: 'financeiro', perm: 'financeiro.ver' },
                { id: 'usuarios', perm: '' },
                { id: 'config', perm: 'config.editar' },
              ].find(t => {
                if (t.id === 'usuarios') return store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id === 1;
                return !t.perm || store.hasPermission(t.perm);
              });
              if (firstTab) setCurrentTab(firstTab.id);
            }}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-sm transition">
              Entendi, guardar o código
            </button>
          </div>
        </div>
      )}
    </div>
  );
}