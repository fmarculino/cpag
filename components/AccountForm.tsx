import React, { useState, useEffect } from 'react';
import { Account, AccountFormData, AccountStatus, AccountType, AccountCategory, SystemSettings, Attachment } from '../types';
import { X, Save, Layers, RefreshCw, Paperclip, Trash2, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { fileService } from '../services/fileService';

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
    observacao: '',
    anexos: []
  });

  // Multiple Installments State
  const [isMultiple, setIsMultiple] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);
  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [valueType, setValueType] = useState<'TOTAL' | 'UNIT'>('TOTAL');
  const [previewInstallments, setPreviewInstallments] = useState<AccountFormData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setUploadError(null);
    const validFiles: File[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!['image/jpeg', 'application/pdf'].includes(file.type)) {
        setUploadError('Apenas arquivos JPG e PDF são permitidos.');
        return;
      }
      if (file.size > maxSize) {
        setUploadError(`Arquivo ${file.name} excede o limite de 5MB.`);
        return;
      }
      validFiles.push(file);
    }

    try {
      setIsUploading(true);
      const newAttachments = await fileService.uploadFiles(validFiles);
      setFormData(prev => ({
        ...prev,
        anexos: [...(prev.anexos || []), ...newAttachments]
      }));
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Erro ao fazer upload dos arquivos. Tente novamente.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeAttachment = async (index: number) => {
    const attachmentToRemove = formData.anexos?.[index];
    if (!attachmentToRemove) return;

    try {
      await fileService.deleteFile(attachmentToRemove.path);
      setFormData(prev => ({
        ...prev,
        anexos: prev.anexos?.filter((_, i) => i !== index)
      }));
    } catch (error) {
      console.error('Error removing attachment:', error);
      // Still remove from UI even if delete fails on server (or show error)
      setFormData(prev => ({
        ...prev,
        anexos: prev.anexos?.filter((_, i) => i !== index)
      }));
    }
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                      <Paperclip className="w-4 h-4" /> Anexos (Notas, Boletos, Comprovantes)
                    </label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-xl cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-dashed border-blue-200 dark:border-blue-800 font-medium text-sm">
                          <Paperclip className="w-4 h-4" />
                          <span>Selecionar Arquivos</span>
                          <input type="file" multiple accept=".jpg,.jpeg,.pdf" onChange={handleFileChange} className="hidden" disabled={isUploading} />
                        </label>
                        {isUploading && (
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enviando...</span>
                          </div>
                        )}
                      </div>

                      {uploadError && <p className="text-red-500 text-xs font-medium">{uploadError}</p>}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">JPG ou PDF, máx. 5MB por arquivo.</p>

                      {formData.anexos && formData.anexos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          {formData.anexos.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 group hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {file.type.includes('image') ? (
                                  <ImageIcon className="w-4 h-4 flex-shrink-0 text-amber-500" />
                                ) : (
                                  <FileText className="w-4 h-4 flex-shrink-0 text-red-500" />
                                )}
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 dark:text-slate-400 truncate hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                                  {file.name}
                                </a>
                              </div>
                              <button type="button" onClick={() => removeAttachment(idx)} className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
            Cancelar
          </button>
          <button type="submit" form="accountForm" disabled={isMultiple && previewInstallments.length === 0} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-5 h-5" />
            <span className="truncate">{isMultiple && previewInstallments.length > 0 ? `Salvar ${previewInstallments.length} Parcela(s)` : 'Salvar Conta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountForm;
