import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MiniFactoryStore } from './lib/store';
import Dashboard from './components/Dashboard';
import Materiais from './components/Materiais';
import Produtos from './components/Produtos';
import EstoqueProdutos from './components/EstoqueProdutos';
import Clientes from './components/Clientes';
import Fornecedores from './components/Fornecedores';
import Pedidos from './components/Pedidos';
import Caixa from './components/Caixa';
import SetupInstructions from './components/SetupInstructions';
import Login from './components/Login';
import AddAdmin from './components/AddAdmin';
import Usuarios from './components/Usuarios';
import Financeiro from './components/Financeiro';
import Configuracao from './components/Configuracao';
import Relatorios from './components/Relatorios';
import SyncStatus from './components/SyncStatus';
import { OnboardingChecklist } from './components/Help';
import './components/Help/driver-overrides.css';
import { 
    isSupabaseConfigured, 
    onAuthStateChange, 
    signOut,
    supabase,
    verificarAdminExiste
} from './lib/supabaseClient';
import { User } from '@supabase/supabase-js';

import { 
  ChefHat, 
  LayoutDashboard, 
  Coins, 
  Layers, 
  Warehouse, 
  Users, 
  Building,
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
  Wifi,
  WifiOff,
  AlertCircle,
  BarChart3
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
  // NETWORK STATUS
  // =====================================================
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const onln = () => { setIsOnline(true); setShowReconnected(true); setTimeout(() => setShowReconnected(false), 4000); };
    const offln = () => setIsOnline(false);
    window.addEventListener('online', onln);
    window.addEventListener('offline', offln);
    return () => {
      window.removeEventListener('online', onln);
      window.removeEventListener('offline', offln);
    };
  }, []);

  // =====================================================
  // EFFECTS - Auth
  // =====================================================
  useEffect(() => {
    let initialAuthDone = false;

    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        setAuthScreen('setup');
        initialAuthDone = true;
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

      initialAuthDone = true;
    };

    initAuth();

    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthScreen('app');
      } else if (initialAuthDone) {
        setCurrentUser(null);
        setStore(null);
        setAuthScreen('login');
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
      miniStore.carregarDadosEmpresa();
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

  useEffect(() => {
    if (store?.dadosEmpresa?.nome_empresa) {
      setAppName(store.dadosEmpresa.nome_empresa);
      localStorage.setItem('appName', store.dadosEmpresa.nome_empresa);
    }
  }, [store?.dadosEmpresa?.nome_empresa]);

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
    setAuthScreen(prev => prev === 'app' ? prev : 'login');
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
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex items-start gap-2.5 lg:gap-3">
              {store?.dadosEmpresa?.logo_url ? (
                <img src={store.dadosEmpresa.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-xl shadow-lg border border-amber-200 dark:border-amber-800/40 shrink-0" />
              ) : (
                <div className="bg-amber-600 w-20 h-20 flex items-center justify-center rounded-xl text-amber-950 shrink-0 shadow-lg border border-amber-200 dark:border-amber-800/40">
                  <ChefHat size={32} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="font-display font-semibold text-xs lg:text-sm tracking-tight leading-snug truncate">{appName}</h2>
                <p className="text-[8px] lg:text-[10px] text-amber-700 dark:text-amber-400 font-mono tracking-wider font-semibold truncate">{store?.dadosEmpresa?.slogan || 'ESTOQUE & PEDIDOS'}</p>
                <div className="mt-2 space-y-0.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
                    <Shield size={12} /> {store.perfilNome(store.perfisUsuarios.find(u => u.id === store.currentUserId)?.perfil_id ?? 3)}: {store.perfisUsuarios.find(u => u.id === store.currentUserId)?.nome || currentUser?.user_metadata?.nome || 'Usuário'}
                  </span>
                  <p className="text-[10px] text-[#5c4a37]/60 dark:text-amber-100/40 font-mono truncate leading-tight">
                    {currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#ebdcc9] dark:border-[#1e1005]"></div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar py-2">
            <nav className="space-y-1" id="desktop-nav" data-help="sidebar">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} />, perm: null },
                { id: 'caixa', label: 'Caixa', icon: <Wallet size={15} />, perm: 'financeiro.ver' },
                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={15} />, perm: 'financeiro.ver' },
                { id: 'relatorios', label: 'Relatórios', icon: <BarChart3 size={15} />, perm: 'financeiro.ver' },
                { id: 'materiais', label: 'Insumos', icon: <Coins size={15} />, perm: 'materiais.ver' },
                { id: 'produtos', label: 'Produtos', icon: <Layers size={16} />, perm: 'produtos.ver' },
                { id: 'pedidos', label: 'Pedidos', icon: <ShoppingBag size={15} />, perm: 'pedidos.ver' },
                { id: 'estoque', label: 'Estoque', icon: <Warehouse size={15} />, perm: 'estoque.ver' },
                { id: 'clientes', label: 'Clientes', icon: <Users size={15} />, perm: 'clientes.ver' },
                { id: 'fornecedores', label: 'Fornecedores', icon: <Building size={15} />, perm: 'fornecedores.ver' },
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
                    data-help={item.id}
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

            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <SyncStatus store={store} />
              </div>
              <OnboardingChecklist moduleId={currentTab} />
            </div>

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
          {store?.dadosEmpresa?.logo_url ? (
                  <img src={store.dadosEmpresa.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-xl shadow-md border border-amber-200 dark:border-amber-800/40" />
          ) : (
            <div className="bg-amber-600 w-20 h-20 flex items-center justify-center rounded-xl text-amber-950 shrink-0 shadow-md border border-amber-200 dark:border-amber-800/40">
              <ChefHat size={28} />
            </div>
          )}
          <span className="font-display font-bold text-sm tracking-tight text-[#2e2315] dark:text-white">{appName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-lg bg-[#f0eade] dark:bg-[#130b04] border border-[#ebdcc9] dark:border-[#1e1005] text-amber-700 dark:text-amber-400 hover:opacity-85 transition"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-[#ebe2d5] dark:hover:bg-[#1e140b] transition"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-[#f8f5ee] dark:bg-[#0c0703] shadow-2xl border-l border-[#ebdcc9] dark:border-[#1e1005] p-5 animate-in slide-in-from-right-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ebdcc9] dark:border-[#1e1005]">
              <span className="font-display font-bold text-sm text-[#2e2315] dark:text-white">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-amber-950 p-1">
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'caixa', label: 'Caixa', icon: <Wallet size={16} />, perm: 'financeiro.ver' },
                { id: 'clientes', label: 'Clientes', icon: <Users size={16} />, perm: 'clientes.ver' },
                { id: 'fornecedores', label: 'Fornecedores', icon: <Building size={16} />, perm: 'fornecedores.ver' },
                { id: 'financeiro', label: 'Financeiro', icon: <DollarSign size={16} />, perm: 'financeiro.ver' },
                { id: 'produtos', label: 'Produtos', icon: <Layers size={16} />, perm: 'produtos.ver' },
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
                    data-help={item.id}
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
        
        {/* NETWORK ERROR BANNER */}
        {(!isOnline || store.errorType === 'network') && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold animate-in slide-in-from-top-1">
            <WifiOff size={14} className="shrink-0" />
            <span className="flex-1">Sem conexão com o servidor. Suas alterações não serão salvas. Verifique sua internet e tente novamente.</span>
            {store.error && (
              <button onClick={() => store.clearError()} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold text-sm px-1 leading-none">&times;</button>
            )}
          </div>
        )}

        {/* SERVER ERROR BANNER */}
        {store.errorType === 'server' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold animate-in slide-in-from-top-1">
            <AlertCircle size={14} className="shrink-0" />
            <span className="flex-1">Erro no servidor — contate o supervisor. {store.error}</span>
            <button onClick={() => store.clearError()} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold text-sm px-1 leading-none">&times;</button>
          </div>
        )}

        {/* CONEXÃO RESTAURADA TOAST */}
        {showReconnected && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold animate-in slide-in-from-top-1">
            <Wifi size={14} className="shrink-0" />
            <span className="flex-1">Conexão restaurada! Você já pode salvar seus dados novamente.</span>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <Dashboard 
            store={store} 
            onNavigate={setCurrentTab} 
            onSetQuickOrder={handleQuickOrder}
            onSetQuickLot={handleQuickLot}
            appName={appName}
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

        {currentTab === 'fornecedores' && store.hasPermission('fornecedores.ver') && (
          <Fornecedores store={store} onUpdate={() => setUpdateTick(t => t + 1)} />
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

        {currentTab === 'relatorios' && store.hasPermission('financeiro.ver') && (
          <Relatorios store={store} />
        )}

        {currentTab === 'config' && store.hasPermission('config.editar') && (
          <Configuracao store={store} />
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
          { id: 'estoque', label: 'Estoque de Produtos', icon: <Warehouse size={18} />, perm: 'estoque.ver' },
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
    </div>
  );
}