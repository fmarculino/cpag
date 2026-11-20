import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronRight,
  Download,
  HelpCircle,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Palette,
  PieChart as PieIcon,
  Plus,
  Settings,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import AccountForm from './components/AccountForm';
import AccountList from './components/AccountList';
import AppSettingsView from './components/AppSettingsView';
import Dashboard from './components/Dashboard';
import HelpModal from './components/HelpModal';
import ImportModal from './components/ImportModal';
import Login from './components/Login';
import UserManagement, { UserManagementRef } from './components/UserManagement';
import { authService } from './services/auth';
import { settingsService } from './services/settingsService';
import { storageService } from './services/storage';
import { userService } from './services/userService';
import {
  Account,
  AccountFormData,
  AccountStatus,
  SystemSettings,
  Theme,
  User,
  UserRole,
} from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const userMgmtRef = useRef<UserManagementRef>(null);

  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    'dashboard' | 'transactions' | 'users' | 'settings'
  >('dashboard');

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // Initial session resolution + Auth state listener (defers profile fetch outside auth lock)
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (isMounted) {
          setAppError((error as Error).message || 'Erro ao verificar sessão.');
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    void initSession();

    const unsubscribe = authService.onAuthStateChange((event, sessionUserId) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsAuthChecking(false);
        return;
      }

      if (event === 'SIGNED_OUT' || !sessionUserId) {
        setCurrentUser(null);
        setAccounts([]);
        setSystemSettings(null);
        setIsPasswordRecovery(false);
        setIsAuthChecking(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setTimeout(() => {
          void (async () => {
            try {
              const user = await authService.fetchUserProfile(sessionUserId);
              if (isMounted && user) {
                setCurrentUser(user);
              }
            } catch (error) {
              if (isMounted) {
                setAppError((error as Error).message || 'Erro ao atualizar sessão.');
              }
            }
          })();
        }, 0);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Theme effect
  useEffect(() => {
    if (!currentUser) {
      document.documentElement.classList.remove('dark');
      return;
    }

    const applyTheme = (theme: Theme) => {
      if (
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme(currentUser.preferredTheme);

    if (currentUser.preferredTheme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [currentUser]);

  // Enforce ADMIN-only view guard
  useEffect(() => {
    if (currentUser && !isAdmin && (activeView === 'users' || activeView === 'settings')) {
      setActiveView('dashboard');
    }
  }, [currentUser, isAdmin, activeView]);

  // Load initial data after authenticated
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);
      setAppError(null);
      try {
        const [loadedAccounts, loadedSettings] = await Promise.all([
          storageService.getAccounts(),
          settingsService.getSettings(),
        ]);
        if (isMounted) {
          setAccounts(loadedAccounts);
          setSystemSettings(loadedSettings);
        }
      } catch (error) {
        if (isMounted) {
          setAppError(
            (error as Error).message || 'Não foi possível carregar os dados financeiros.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleLogin = (user: User) => {
    setAppError(null);
    setIsPasswordRecovery(false);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
      setAccounts([]);
      setSystemSettings(null);
      setActiveView('dashboard');
    } catch (error) {
      setAppError((error as Error).message || 'Erro ao sair do sistema.');
    }
  };

  const handleUpdateTheme = async (theme: Theme) => {
    if (!currentUser) return;
    const previousUser = currentUser;
    const updatedUser = { ...currentUser, preferredTheme: theme };
    setCurrentUser(updatedUser);
    setIsThemeMenuOpen(false);
    setAppError(null);

    try {
      await userService.updatePreferredTheme(currentUser.id, theme);
    } catch (error) {
      setCurrentUser(previousUser);
      setAppError((error as Error).message || 'Erro ao salvar preferência de tema.');
    }
  };

  const handleSaveAccount = async (data: AccountFormData | AccountFormData[]) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setAppError(null);
    try {
      if (Array.isArray(data)) {
        const now = Date.now();
        const newAccounts: Account[] = data.map((item) => ({
          ...item,
          id: crypto.randomUUID(),
          createdAt: now,
        }));
        await storageService.addAccounts(newAccounts);
      } else if (editingAccount) {
        const updated: Account = { ...editingAccount, ...data };
        await storageService.updateAccount(updated);
      } else {
        const newAccount: Account = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        await storageService.addAccount(newAccount);
      }
      const refreshed = await storageService.getAccounts();
      setAccounts(refreshed);
      setIsFormOpen(false);
      setEditingAccount(undefined);
    } catch (error) {
      setAppError((error as Error).message || 'Erro ao salvar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeletion = async () => {
    if (!isAdmin || !idsToDelete) return;

    setIsLoading(true);
    setAppError(null);
    try {
      await storageService.deleteAccounts(idsToDelete);
      const refreshed = await storageService.getAccounts();
      setAccounts(refreshed);
      setIdsToDelete(null);
    } catch (error) {
      setAppError((error as Error).message || 'Erro ao excluir registro(s).');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (ids: string[], status: AccountStatus) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setAppError(null);
    try {
      await storageService.updateStatusBulk(ids, status);
      const refreshed = await storageService.getAccounts();
      setAccounts(refreshed);
    } catch (error) {
      setAppError((error as Error).message || 'Erro ao atualizar status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (imported: Account[]) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setAppError(null);
    try {
      await storageService.addAccounts(imported);
      const refreshed = await storageService.getAccounts();
      setAccounts(refreshed);
    } catch (error) {
      setAppError((error as Error).message || 'Erro ao importar lançamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">
            Verificando sessão...
          </p>
        </div>
      </div>
    );
  }

  if (isPasswordRecovery) {
    return (
      <Login
        onLogin={handleLogin}
        initialMode="reset"
        onPasswordUpdated={async () => {
          setIsPasswordRecovery(false);
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }}
        onCancelReset={async () => {
          setIsPasswordRecovery(false);
          await authService.logout();
        }}
      />
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const effectiveView =
    !isAdmin && (activeView === 'users' || activeView === 'settings')
      ? 'dashboard'
      : activeView;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <PieIcon className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
            FinancePro
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-40 transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <div className="hidden md:flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <PieIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              FinancePro
            </h1>
          </div>

          <nav className="space-y-1 flex-1">
            <button
              type="button"
              onClick={() => {
                setActiveView('dashboard');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                effectiveView === 'dashboard'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('transactions');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                effectiveView === 'transactions'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <List className="w-5 h-5" /> Movimentações
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('users');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    effectiveView === 'users'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-5 h-5" /> Usuários
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('settings');
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors ${
                    effectiveView === 'settings'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Settings className="w-5 h-5" /> Configurações
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
            >
              <HelpCircle className="w-5 h-5" /> Ajuda
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-sm">Tema</span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isThemeMenuOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {isThemeMenuOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                  <button
                    type="button"
                    onClick={() => handleUpdateTheme('light')}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      currentUser.preferredTheme === 'light'
                        ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        currentUser.preferredTheme === 'light'
                          ? 'border-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {currentUser.preferredTheme === 'light' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <Sun className="w-4 h-4" /> <span className="text-sm font-medium">Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTheme('dark')}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      currentUser.preferredTheme === 'dark'
                        ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        currentUser.preferredTheme === 'dark'
                          ? 'border-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {currentUser.preferredTheme === 'dark' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <Moon className="w-4 h-4" />{' '}
                    <span className="text-sm font-medium">Escuro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateTheme('system')}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                      currentUser.preferredTheme === 'system'
                        ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        currentUser.preferredTheme === 'system'
                          ? 'border-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {currentUser.preferredTheme === 'system' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                    <Monitor className="w-4 h-4" />{' '}
                    <span className="text-sm font-medium">Sistema</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 text-slate-500">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
            >
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {appError && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{appError}</span>
            </div>
            <button
              type="button"
              onClick={() => setAppError(null)}
              className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40"
              aria-label="Fechar alerta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {effectiveView === 'dashboard'
                ? 'Resumo Financeiro'
                : effectiveView === 'transactions'
                ? 'Movimentações'
                : effectiveView === 'users'
                ? 'Gestão de Usuários'
                : 'Configurações do Sistema'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {effectiveView === 'dashboard'
                ? 'Gerencie suas contas a pagar de forma inteligente e rápida.'
                : effectiveView === 'transactions'
                ? 'Visualize e gerencie todas as suas movimentações financeiras.'
                : effectiveView === 'users'
                ? 'Gerencie os usuários e permissões de acesso ao sistema.'
                : 'Personalize o sistema com categorias, tipos e status customizados.'}
            </p>
          </div>
          {effectiveView === 'transactions' && isAdmin && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" /> Importar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAccount(undefined);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <Plus className="w-5 h-5" /> Nova Conta
              </button>
            </div>
          )}
          {effectiveView === 'users' && isAdmin && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => userMgmtRef.current?.handleOpenModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
              >
                <UserPlus className="w-5 h-5" /> Novo Usuário
              </button>
            </div>
          )}
        </header>

        {effectiveView === 'dashboard' ? (
          <Dashboard accounts={accounts} />
        ) : effectiveView === 'transactions' ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Relação de Contas
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {accounts.length} Total
              </span>
            </div>

            {systemSettings ? (
              <AccountList
                accounts={accounts}
                systemSettings={systemSettings}
                canManage={isAdmin}
                onEdit={(account) => {
                  setEditingAccount(account);
                  setIsFormOpen(true);
                }}
                onDelete={setIdsToDelete}
                onUpdateStatus={handleUpdateStatus}
              />
            ) : (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        ) : effectiveView === 'users' && isAdmin ? (
          <UserManagement ref={userMgmtRef} currentUserId={currentUser.id} />
        ) : (
          isAdmin && <AppSettingsView onUpdate={setSystemSettings} />
        )}
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-blue-700 dark:text-blue-400 font-bold animate-pulse">
              Sincronizando...
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isAdmin && idsToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {idsToDelete.length === 1
                  ? 'Deseja realmente excluir este registro? Esta ação não pode ser desfeita.'
                  : `Deseja realmente excluir estes ${idsToDelete.length} registros selecionados? Esta ação não pode ser desfeita.`}
              </p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
              <button
                type="button"
                onClick={() => setIdsToDelete(null)}
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeletion}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAdmin && isFormOpen && systemSettings && (
        <AccountForm
          initialData={editingAccount}
          systemSettings={systemSettings}
          onSave={handleSaveAccount}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAccount(undefined);
          }}
        />
      )}

      {isAdmin && isImportOpen && (
        <ImportModal onImport={handleImport} onClose={() => setIsImportOpen(false)} />
      )}

      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  );
};

export default App;
