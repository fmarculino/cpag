
import React, { useState, useEffect, useCallback } from 'react';
import { Account, AccountStatus, AccountFormData, User, UserRole, Theme, SystemSettings, AccountType, AccountCategory } from './types';
import { storageService } from './services/storage';
import { settingsService } from './services/settingsService';
import { authService } from './services/auth';
import { userService } from './services/userService';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import AccountForm from './components/AccountForm';
import ImportModal from './components/ImportModal';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import SettingsMenu from './components/SettingsMenu';
import { Plus, Download, Sparkles, LayoutDashboard, List, PieChart as PieIcon, Settings, Trash2, AlertTriangle, X, LogOut, Users, Sun, Moon, Monitor, ChevronRight, Palette } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(authService.getCurrentUser());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  // Estado para controle de exclusão
  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null);

  // Theme effect
  useEffect(() => {
    if (!currentUser) {
      document.documentElement.classList.remove('dark');
      return;
    }

    const applyTheme = (theme: Theme) => {
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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

  useEffect(() => {
    if (!currentUser) return;
    const loadData = async () => {
      setIsLoading(true);
      const [loadedAccounts, loadedSettings] = await Promise.all([
        storageService.getAccounts(),
        settingsService.getSettings()
      ]);
      setAccounts(loadedAccounts);
      setSystemSettings(loadedSettings);
      setIsLoading(false);
    };
    loadData();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const handleUpdateTheme = async (theme: Theme) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, preferredTheme: theme };
    setCurrentUser(updatedUser);
    authService.updateSession(updatedUser);
    await userService.updatePreferredTheme(currentUser.id, theme);
    setIsThemeMenuOpen(false);
  };

  const handleSaveAccount = async (data: AccountFormData | AccountFormData[]) => {
    setIsLoading(true);
    if (Array.isArray(data)) {
      const newAccounts: Account[] = data.map((item, index) => ({
        ...item,
        id: `acc-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      }));
      await storageService.addAccounts(newAccounts);
    } else {
      if (editingAccount) {
        const updated = { ...editingAccount, ...data };
        await storageService.updateAccount(updated);
      } else {
        const newAccount: Account = {
          ...data,
          id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now()
        };
        await storageService.addAccount(newAccount);
      }
    }
    const refreshed = await storageService.getAccounts();
    setAccounts(refreshed);
    setIsLoading(false);
    setIsFormOpen(false);
    setEditingAccount(undefined);
  };

  const confirmDeletion = async () => {
    if (!idsToDelete) return;

    setIsLoading(true);
    await storageService.deleteAccounts(idsToDelete);

    const refreshed = await storageService.getAccounts();
    setAccounts(refreshed);
    setIsLoading(false);
    setIdsToDelete(null);
  };

  const handleUpdateStatus = async (ids: string[], status: AccountStatus) => {
    setIsLoading(true);
    await storageService.updateStatusBulk(ids, status);
    const refreshed = await storageService.getAccounts();
    setAccounts(refreshed);
    setIsLoading(false);
  };

  const handleImport = async (imported: Account[]) => {
    setIsLoading(true);
    const current = await storageService.getAccounts();
    const merged = [...current, ...imported];
    await storageService.saveAccounts(merged);
    setAccounts(merged);
    setIsLoading(false);
  };


  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-20 sticky top-0 h-auto md:h-screen">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <PieIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
              FinancePro
            </h1>
          </div>

          <nav className="space-y-1 flex-1">
            <button type="button" className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl font-semibold">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
              <List className="w-5 h-5" /> Movimentações
            </button>

            {currentUser.role === UserRole.ADMIN && (
              <button
                type="button"
                onClick={() => setIsUserMgmtOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
              >
                <Users className="w-5 h-5" /> Gestão de Usuários
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
              <Settings className="w-5 h-5" /> Configurações
            </button>
          </nav>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {/* Theme Selector as per reference images */}
            <div className="relative">
              <button
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-sm">Tema</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isThemeMenuOpen ? 'rotate-90' : ''}`} />
              </button>

              {isThemeMenuOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
                  <button onClick={() => handleUpdateTheme('light')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${currentUser.preferredTheme === 'light' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentUser.preferredTheme === 'light' ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {currentUser.preferredTheme === 'light' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                    </div>
                    <Sun className="w-4 h-4" /> <span className="text-sm font-medium">Claro</span>
                  </button>
                  <button onClick={() => handleUpdateTheme('dark')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${currentUser.preferredTheme === 'dark' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentUser.preferredTheme === 'dark' ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {currentUser.preferredTheme === 'dark' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                    </div>
                    <Moon className="w-4 h-4" /> <span className="text-sm font-medium">Escuro</span>
                  </button>
                  <button onClick={() => handleUpdateTheme('system')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${currentUser.preferredTheme === 'system' ? 'text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${currentUser.preferredTheme === 'system' ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                      {currentUser.preferredTheme === 'system' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                    </div>
                    <Monitor className="w-4 h-4" /> <span className="text-sm font-medium">Sistema</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 text-slate-500">
              <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100 dark:hover:border-red-900/20"
            >
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Resumo Financeiro</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie suas contas a pagar de forma inteligente e rápida.</p>
          </div>
          <div className="flex gap-3">
            {currentUser?.role === UserRole.ADMIN && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" /> Importar
              </button>
            )}
            <button
              type="button"
              onClick={() => { setEditingAccount(undefined); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" /> Nova Conta
            </button>
          </div>
        </header>


        <Dashboard accounts={accounts} />

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Relação de Contas</h3>
            <span className="text-xs font-medium px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {accounts.length} Total
            </span>
          </div>

          {systemSettings ? (
            <AccountList
              accounts={accounts}
              systemSettings={systemSettings}
              onEdit={account => {
                setEditingAccount(account);
                setIsFormOpen(true);
              }}
              onDelete={setIdsToDelete}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </main>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-blue-700 font-bold animate-pulse">Sincronizando...</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {idsToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500">
                {idsToDelete.length === 1
                  ? 'Deseja realmente excluir este registro? Esta ação não pode ser desfeita.'
                  : `Deseja realmente excluir estes ${idsToDelete.length} registros selecionados? Esta ação não pode ser desfeita.`}
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button
                onClick={() => setIdsToDelete(null)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
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
      {isFormOpen && systemSettings && (
        <AccountForm
          initialData={editingAccount}
          systemSettings={systemSettings}
          onSave={handleSaveAccount}
          onClose={() => { setIsFormOpen(false); setEditingAccount(undefined); }}
        />
      )}

      {isImportOpen && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {isUserMgmtOpen && (
        <UserManagement
          onClose={() => setIsUserMgmtOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsMenu
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdated={setSystemSettings}
        />
      )}
    </div>
  );
};

export default App;
