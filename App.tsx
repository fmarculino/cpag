
import React, { useState, useEffect, useCallback } from 'react';
import { Account, AccountStatus, AccountFormData } from './types';
import { storageService } from './services/storage';
import { geminiService } from './services/gemini';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import AccountForm from './components/AccountForm';
import ImportModal from './components/ImportModal';
import { Plus, Download, Sparkles, LayoutDashboard, List, PieChart as PieIcon, Settings, Trash2, AlertTriangle, X } from 'lucide-react';

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Estado para controle de exclusão
  const [idsToDelete, setIdsToDelete] = useState<string[] | null>(null);

  useEffect(() => {
    const loadedAccounts = storageService.getAccounts();
    setAccounts(loadedAccounts);
  }, []);

  const handleSaveAccount = (data: AccountFormData) => {
    if (editingAccount) {
      const updated = { ...editingAccount, ...data };
      storageService.updateAccount(updated);
    } else {
      const newAccount: Account = {
        ...data,
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now()
      };
      storageService.addAccount(newAccount);
    }
    setAccounts(storageService.getAccounts());
    setIsFormOpen(false);
    setEditingAccount(undefined);
  };

  const confirmDeletion = () => {
    if (!idsToDelete) return;
    
    // 1. Atualizar Storage
    storageService.deleteAccounts(idsToDelete);
    
    // 2. Atualizar Estado Local
    setAccounts(prev => prev.filter(acc => !idsToDelete.includes(acc.id)));
    
    // 3. Limpar estado de exclusão
    setIdsToDelete(null);
  };

  const handleUpdateStatus = (ids: string[], status: AccountStatus) => {
    storageService.updateStatusBulk(ids, status);
    setAccounts(storageService.getAccounts());
  };

  const handleImport = (imported: Account[]) => {
    const current = storageService.getAccounts();
    const merged = [...current, ...imported];
    storageService.saveAccounts(merged);
    setAccounts(merged);
  };

  const fetchInsights = async () => {
    setIsAiLoading(true);
    const insights = await geminiService.getInsights(accounts);
    setAiInsights(insights);
    setIsAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 sticky top-0 h-auto md:h-screen">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <PieIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              FinancePro
            </h1>
          </div>

          <nav className="space-y-1">
            <button type="button" className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-semibold">
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
              <List className="w-5 h-5" /> Movimentações
            </button>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
              <Settings className="w-5 h-5" /> Configurações
            </button>
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-100">
             <button 
              type="button"
              onClick={fetchInsights}
              disabled={isAiLoading || accounts.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-100 transition-colors border border-indigo-100 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-pulse' : ''}`} />
              {isAiLoading ? 'Analisando...' : 'IA Insights'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Resumo Financeiro</h2>
            <p className="text-slate-500 text-sm">Gerencie suas contas a pagar de forma inteligente e rápida.</p>
          </div>
          <div className="flex gap-3">
            <button 
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download className="w-4 h-4" /> Importar
            </button>
            <button 
              type="button"
              onClick={() => { setEditingAccount(undefined); setIsFormOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-5 h-5" /> Nova Conta
            </button>
          </div>
        </header>

        {aiInsights && (
          <div className="mb-8 p-6 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
              <Sparkles className="w-24 h-24" />
            </div>
            <h3 className="flex items-center gap-2 font-bold mb-3">
              <Sparkles className="w-5 h-5" /> Insights da Inteligência Artificial
            </h3>
            <div className="text-indigo-50 text-sm leading-relaxed whitespace-pre-wrap max-w-3xl">
              {aiInsights}
            </div>
            <button 
              type="button"
              onClick={() => setAiInsights('')}
              className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        )}

        <Dashboard accounts={accounts} />

        <div className="mb-6">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Relação de Contas</h3>
              <span className="text-xs font-medium px-2 py-1 bg-slate-200 rounded text-slate-600 uppercase tracking-wider">
                {accounts.length} Registros
              </span>
           </div>
           <AccountList 
            accounts={accounts}
            onEdit={(acc) => { setEditingAccount(acc); setIsFormOpen(true); }}
            onDelete={(ids) => setIdsToDelete(ids)}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      </main>

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
      {isFormOpen && (
        <AccountForm 
          initialData={editingAccount}
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
    </div>
  );
};

export default App;
