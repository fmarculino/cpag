import React, { useState, useEffect } from 'react';
import { Account, AccountFormData, AccountStatus, AccountType, AccountCategory, SystemSettings } from '../types';
import { X, Save, Layers, RefreshCw } from 'lucide-react';

interface AccountFormProps {
  initialData?: Account;
  systemSettings: SystemSettings;
  onSave: (data: AccountFormData | AccountFormData[]) => void;
  onClose: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ initialData, systemSettings, onSave, onClose }) => {
  const [formData, setFormData] = useState<AccountFormData>({
    dataMovimento: new Date().toISOString().split('T')[0],
    local: '',
    fornecedor: '',
    titulo: '',
    empresa: '',
    vencimento: new Date().toISOString().split('T')[0],
    valor: 0,
    tipo: (systemSettings.accountTypes[0] as AccountType) || AccountType.DESPESA,
    categoria: (systemSettings.accountCategories[0] as AccountCategory) || AccountCategory.OUTROS,
    status: (systemSettings.accountStatuses[0] as AccountStatus) || AccountStatus.PENDENTE,
    observacao: ''
  });

  // Multiple Installments State
  const [isMultiple, setIsMultiple] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [valueType, setValueType] = useState<'TOTAL' | 'UNIT'>('TOTAL');
  const [previewInstallments, setPreviewInstallments] = useState<AccountFormData[]>([]);

  useEffect(() => {
    if (initialData) {
      const { id, createdAt, ...rest } = initialData;
      setFormData(prev => ({ ...prev, ...rest }));
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMultiple && previewInstallments.length > 0) {
      onSave(previewInstallments);
    } else {
      onSave(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'valor' ? parseFloat(value) || 0 : value
    }));
  };

  const checkValueInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow empty value while typing
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value)
    }));
  };

  const generatePreview = () => {
    const installments: AccountFormData[] = [];
    const baseDate = new Date(formData.vencimento + 'T00:00:00'); // Ensure it parses as local date
    const totalOrUnitValue = typeof formData.valor === 'string' ? parseFloat(formData.valor) || 0 : formData.valor;

    const unitValue = valueType === 'TOTAL'
      ? Number((totalOrUnitValue / installmentsCount).toFixed(2))
      : totalOrUnitValue;

    let difference = 0;
    if (valueType === 'TOTAL') {
      difference = totalOrUnitValue - (unitValue * installmentsCount);
    }

    const baseTitle = formData.titulo.trim();

    for (let i = 0; i < installmentsCount; i++) {
      const currentDate = new Date(baseDate.getTime());
      currentDate.setDate(currentDate.getDate() + (i * intervalDays));

      const dateString = currentDate.toISOString().split('T')[0];

      const currentTitle = baseTitle ? `${baseTitle} parcela ${String(i + 1).padStart(2, '0')}/${String(installmentsCount).padStart(2, '0')}` : `Parcela ${String(i + 1).padStart(2, '0')}/${String(installmentsCount).padStart(2, '0')}`;

      let currentValue = unitValue;
      if (i === installmentsCount - 1 && valueType === 'TOTAL') {
        currentValue = Number((unitValue + difference).toFixed(2));
      }

      installments.push({
        ...formData,
        vencimento: dateString,
        valor: currentValue,
        titulo: currentTitle
      });
    }
    setPreviewInstallments(installments);
  };

  const handlePreviewChange = (index: number, field: string, value: string | number) => {
    setPreviewInstallments(prev => {
      const newArr = [...prev];
      newArr[index] = {
        ...newArr[index],
        [field]: field === 'valor' ? (parseFloat(value as string) || 0) : value
      };
      return newArr;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            {initialData ? 'Editar Conta' : 'Nova Conta'}
            {!initialData && isMultiple && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full ml-2">Múltiplas Parcelas</span>}
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="accountForm" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Form Data Section */}
              <div className="space-y-4">
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
                    <input type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" placeholder={isMultiple ? "Ex: Consorcio fiat" : ""} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Empresa</label>
                    <input type="text" name="empresa" value={formData.empresa} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimento {isMultiple && '(Base)'}</label>
                    <input type="date" name="vencimento" value={formData.vencimento} onChange={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Valor</label>
                    <input type="number" step="0.01" name="valor" value={formData.valor === 0 ? '' : formData.valor} onChange={checkValueInput} onBlur={handleChange} required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Conta Contábil</label>
                    <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                      {systemSettings.accountTypes.map(type => (
                        <option key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                    <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                      {systemSettings.accountCategories.map(cat => (
                        <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                      {systemSettings.accountStatuses.map(status => (
                        <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Observação</label>
                    <textarea name="observacao" value={formData.observacao} onChange={handleChange} rows={2} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none" />
                  </div>
                </div>
              </div>

              {/* Installments Section */}
              {!initialData && (
                <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">Múltiplas Parcelas</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isMultiple} onChange={(e) => {
                        setIsMultiple(e.target.checked);
                        if (!e.target.checked) setPreviewInstallments([]);
                      }} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {isMultiple && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade</label>
                          <input type="number" min="2" max="100" value={installmentsCount} onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 2)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Período (dias)</label>
                          <input type="number" min="1" max="365" value={intervalDays} onChange={(e) => setIntervalDays(parseInt(e.target.value) || 30)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Divisão do Valor</label>
                          <select value={valueType} onChange={(e) => setValueType(e.target.value as 'TOTAL' | 'UNIT')} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                            <option value="TOTAL">Valor Informado é o Total (dividir pelas parcelas)</option>
                            <option value="UNIT">Valor Informado é Unitário (para cada parcela)</option>
                          </select>
                        </div>
                      </div>

                      <button type="button" onClick={generatePreview} className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm">
                        <RefreshCw className="w-4 h-4" /> Gerar Prévia das Parcelas
                      </button>

                      {previewInstallments.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Ajuste Manual (Prévia)</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {previewInstallments.map((inst, idx) => (
                              <div key={idx} className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <input type="text" value={inst.titulo} onChange={(e) => handlePreviewChange(idx, 'titulo', e.target.value)} className="flex-1 px-2 py-1 bg-transparent border-b border-transparent focus:border-blue-500 outline-none text-sm text-slate-800 dark:text-slate-200 font-medium" />
                                </div>
                                <div className="flex items-center gap-2 pl-9">
                                  <input type="date" value={inst.vencimento} onChange={(e) => handlePreviewChange(idx, 'vencimento', e.target.value)} className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md outline-none text-xs text-slate-700 dark:text-slate-300" />
                                  <div className="relative flex-1">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                                    <input type="number" step="0.01" value={inst.valor} onChange={(e) => handlePreviewChange(idx, 'valor', e.target.value)} className="w-full pl-6 pr-2 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md outline-none text-xs text-slate-700 dark:text-slate-300" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            Cancelar
          </button>
          <button type="submit" form="accountForm" disabled={isMultiple && previewInstallments.length === 0} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-5 h-5" />
            {isMultiple && previewInstallments.length > 0 ? `Salvar ${previewInstallments.length} Parcelas` : 'Salvar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
