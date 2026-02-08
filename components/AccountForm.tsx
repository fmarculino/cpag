
import React, { useState, useEffect } from 'react';
import { Account, AccountStatus, AccountType, AccountCategory, AccountFormData } from '../types';
import { X, Save } from 'lucide-react';

interface AccountFormProps {
  initialData?: Account;
  onSave: (data: AccountFormData) => void;
  onClose: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState<AccountFormData>({
    dataMovimento: new Date().toISOString().split('T')[0],
    local: '',
    fornecedor: '',
    titulo: '',
    empresa: '',
    vencimento: new Date().toISOString().split('T')[0],
    valor: 0,
    tipo: AccountType.DESPESA,
    categoria: AccountCategory.OUTROS,
    status: AccountStatus.PENDENTE,
    observacao: ''
  });

  useEffect(() => {
    if (initialData) {
      const { id, createdAt, ...rest } = initialData;
      setFormData(prev => ({ ...prev, ...rest }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'valor' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {initialData ? 'Editar Conta' : 'Nova Conta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Data Movimento</label>
              <input type="date" name="dataMovimento" value={formData.dataMovimento} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Local (Cidade)</label>
              <input type="text" name="local" value={formData.local} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Fornecedor</label>
              <input type="text" name="fornecedor" value={formData.fornecedor} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Título / Nota</label>
              <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Empresa</label>
              <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimento</label>
              <input type="date" name="vencimento" value={formData.vencimento} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Valor</label>
              <input type="number" step="0.01" name="valor" value={formData.valor} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Conta Contábil</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                <option value={AccountType.DESPESA}>Despesa</option>
                <option value={AccountType.COMPRA}>Compra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                {Object.values(AccountCategory).map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                <option value={AccountStatus.PENDENTE}>Pendente</option>
                <option value={AccountStatus.PAGO}>Pago</option>
                <option value={AccountStatus.CANCELADO}>Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Observação</label>
            <textarea name="observacao" value={formData.observacao} onChange={handleChange} rows={3} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none" />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
              <Save className="w-5 h-5" />
              Salvar Conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
