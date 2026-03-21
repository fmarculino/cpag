import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Globe, 
  Layout, 
  Database, 
  Check, 
  AlertCircle,
  Hash,
  List,
  Activity,
  Plus,
  Edit3,
  X,
  FileJson,
  UploadCloud,
  RefreshCcw,
  UserCheck
} from 'lucide-react';
import { SystemSettings, Theme } from '../types';
import { settingsService } from '../services/settingsService';
import { storageService } from '../services/storage';
import { userService } from '../services/userService';
import { backupService } from '../services/backupService';

interface Props {
    onUpdate?: (settings: SystemSettings) => void;
}

const AppSettingsView: React.FC<Props> = ({ onUpdate }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic Lists Edit State
    const [newInput, setNewInput] = useState<{ [key: string]: string }>({ types: '', categories: '', statuses: '' });
    
    // Inline Edit State
    const [editingItem, setEditingItem] = useState<{ 
        key: 'accountTypes' | 'accountCategories' | 'accountStatuses', 
        index: number, 
        originalValue: string,
        value: string 
    } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await settingsService.getSettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const showMessage = (type: 'success' | 'error' | 'warning', text: string) => {
        setMessage({ type, text });
        if (type !== 'warning') {
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await settingsService.updateSettings(settings);
            if (onUpdate) onUpdate(settings);
            showMessage('success', 'Configurações salvas com sucesso!');
        } catch (e) {
            showMessage('error', 'Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = (key: 'accountTypes' | 'accountCategories' | 'accountStatuses', inputKey: string) => {
        if (!settings || !newInput[inputKey].trim()) return;

        const val = newInput[inputKey].trim().toUpperCase();
        if (settings[key].includes(val)) {
            showMessage('error', 'Este item já existe.');
            return;
        }

        setSettings({
            ...settings,
            [key]: [...settings[key], val]
        });
        setNewInput(prev => ({ ...prev, [inputKey]: '' }));
    };

    const handleEditStart = (key: 'accountTypes' | 'accountCategories' | 'accountStatuses', index: number) => {
        if (!settings) return;
        const value = settings[key][index];
        setEditingItem({ key, index, originalValue: value, value });
    };

    const handleEditCancel = () => {
        setEditingItem(null);
    };

    const handleEditSave = async () => {
        if (!editingItem || !settings) return;
        
        const newValue = editingItem.value.trim().toUpperCase();
        if (!newValue) {
            setEditingItem(null);
            return;
        }

        // Check if value already exists (if it changed)
        if (newValue !== editingItem.originalValue && settings[editingItem.key].includes(newValue)) {
            showMessage('error', 'Este item já existe na lista.');
            return;
        }

        // Update settings list
        const newList = [...settings[editingItem.key]];
        newList[editingItem.index] = newValue;
        
        const updatedSettings = {
            ...settings,
            [editingItem.key]: newList
        };

        setSettings(updatedSettings);

        // If it changed, we must update all accounts in the background if possible
        if (newValue !== editingItem.originalValue) {
            const columnMap = {
                accountTypes: 'tipo',
                accountCategories: 'categoria',
                accountStatuses: 'status'
            } as const;

            try {
                // This is a powerful action, we do it via storageService
                await storageService.renameValue(
                    columnMap[editingItem.key], 
                    editingItem.originalValue, 
                    newValue
                );
                
                // Save settings immediately
                await settingsService.updateSettings(updatedSettings);
                if (onUpdate) onUpdate(updatedSettings);
                
                showMessage('success', `Item alterado de "${editingItem.originalValue}" para "${newValue}" globalmente.`);
            } catch (e) {
                console.error('Error during rename:', e);
                showMessage('error', 'Erro ao processar alteração global.');
            }
        }

        setEditingItem(null);
    };

    const handleExportBackupAndDownload = async () => {
        if (!settings) return;
        
        setSaving(true);
        showMessage('warning', 'Preparando backup da base de dados...');
        
        try {
            await backupService.exportBackup(settings);
            showMessage('success', 'Backup exportado com sucesso!');
        } catch (error) {
            console.error('Error exporting backup:', error);
            showMessage('error', 'Erro ao gerar arquivo de backup.');
        } finally {
            setSaving(false);
        }
    };

    const handleImportBackupFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Este processo irá substituir ou mesclar os dados atuais com os dados do backup. Recomendamos exportar um backup de segurança antes. Deseja continuar?")) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        try {
            setSaving(true);
            showMessage('warning', 'Iniciando restauração da base de dados...');
            
            const { restoredCount, settings: restoredSettings } = await backupService.importBackup(file);

            if (restoredSettings) {
                setSettings(restoredSettings); // Update local state to reflect changes
                if (onUpdate) onUpdate(restoredSettings);
            }

            setSaving(false);
            showMessage('success', `Restauração concluída! ${restoredCount} módulos atualizados.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            
            setTimeout(() => {
                if (window.confirm("Para garantir que todas as alterações sejam aplicadas corretamente, o sistema precisa ser recarregado. Recarregar agora?")) {
                    window.location.reload();
                }
            }, 1500);

        } catch (error) {
            console.error('Error importing backup:', error);
            setSaving(false);
            showMessage('error', 'Erro ao restaurar arquivo. Formato ZIP inválido ou corrompido.');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center p-24 text-blue-600">
                <RefreshCcw className="w-12 h-12 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mensagem de Feedback Ativa */}
            {message && (
                <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-right-8 ${
                    message.type === 'success' ? 'bg-emerald-500 text-white' : 
                    message.type === 'error' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                    {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold tracking-tight">{message.text}</span>
                </div>
            )}

            {/* Header com Ações */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Configurações do Sistema</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie a identidade e o comportamento global da plataforma.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportBackupAndDownload}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <FileJson className="w-4 h-4" /> Exportar Backup (ZIP)
                    </button>
                    <button
                        onClick={handleImportClick}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all text-sm ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <UploadCloud className="w-4 h-4" /> Restaurar Backup
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImportBackupFromFile} 
                        accept=".zip" 
                        className="hidden" 
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <><Save className="w-5 h-5" /> Salvar Alterações</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna da Esquerda: Identidade e Interface */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Identidade da Empresa */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center">
                                <Globe className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Identidade</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nome da Empresa</label>
                                <input
                                    type="text"
                                    value={settings.companyName}
                                    onChange={e => setSettings({...settings, companyName: e.target.value})}
                                    placeholder="Ex: Minha Empresa LTDA"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Símbolo Monetário</label>
                                <input
                                    type="text"
                                    value={settings.currencySymbol}
                                    onChange={e => setSettings({...settings, currencySymbol: e.target.value})}
                                    placeholder="Ex: R$, $, €"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none font-medium transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Formato de Data</label>
                                <select
                                    value={settings.dateFormat}
                                    onChange={e => setSettings({...settings, dateFormat: e.target.value})}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none font-medium transition-all"
                                >
                                    <option value="dd/MM/yyyy">Dia/Mês/Ano (Brasil)</option>
                                    <option value="MM/dd/yyyy">Mês/Dia/Ano (EUA)</option>
                                    <option value="yyyy-MM-dd">Ano-Mês-Dia (ISO)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Temas e UI */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Layout className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Experiência Visual</h2>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            {(['light', 'dark', 'system'] as Theme[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setSettings({...settings, theme: t})}
                                    className={`flex-1 min-w-[140px] p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${settings.theme === t ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${settings.theme === t ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                        {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                                    </div>
                                    <span className={`font-bold text-sm tracking-tight capitalize ${settings.theme === t ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Coluna da Direita: Cadastros Dinâmicos */}
                <div className="space-y-8">
                    {/* Listas Dinâmicas */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center">
                                <Database className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Listas de Cadastro</h2>
                        </div>

                        {/* Seção Categorias */}
                        <div className="space-y-6">
                            {/* Tipos de Conta */}
                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-widest pl-1">
                                <Hash size={14} /> Tipos de Conta
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {settings.accountTypes.map((type, index) => (
                                    <div key={index} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-500/30 transition-all">
                                        {editingItem?.key === 'accountTypes' && editingItem?.index === index ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingItem.value}
                                                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                                                    className="w-24 bg-white dark:bg-slate-900 border-none outline-none text-xs text-slate-900 dark:text-white uppercase px-1 rounded font-bold"
                                                    autoFocus
                                                />
                                                <button onClick={handleEditSave} className="p-0.5 text-emerald-500 hover:scale-110 transition-transform">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={handleEditCancel} className="p-0.5 text-rose-500 hover:scale-110 transition-transform">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{type}</span>
                                                <button 
                                                    onClick={() => handleEditStart('accountTypes', index)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 hover:scale-110 transition-all"
                                                    title="Alterar"
                                                >
                                                    <Edit3 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newInput.types}
                                    onChange={(e) => setNewInput({ ...newInput, types: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem('accountTypes', 'types')}
                                    placeholder="Novo Tipo"
                                    className="flex-1 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                                <button 
                                    onClick={() => handleAddItem('accountTypes', 'types')}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-widest pl-1">
                                <List size={14} /> Categorias
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {settings.accountCategories.map((cat, index) => (
                                    <div key={index} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-500/30 transition-all">
                                        {editingItem?.key === 'accountCategories' && editingItem?.index === index ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingItem.value}
                                                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                                                    className="w-24 bg-white dark:bg-slate-900 border-none outline-none text-xs text-slate-900 dark:text-white uppercase px-1 rounded font-bold"
                                                    autoFocus
                                                />
                                                <button onClick={handleEditSave} className="p-0.5 text-emerald-500 hover:scale-110 transition-transform">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={handleEditCancel} className="p-0.5 text-rose-500 hover:scale-110 transition-transform">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{cat}</span>
                                                <button 
                                                    onClick={() => handleEditStart('accountCategories', index)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 hover:scale-110 transition-all"
                                                    title="Alterar"
                                                >
                                                    <Edit3 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newInput.categories}
                                    onChange={(e) => setNewInput({ ...newInput, categories: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem('accountCategories', 'categories')}
                                    placeholder="Nova Categoria"
                                    className="flex-1 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                                <button 
                                    onClick={() => handleAddItem('accountCategories', 'categories')}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 tracking-widest pl-1">
                                <Activity size={14} /> Statuses
                            </h4>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {settings.accountStatuses.map((status, index) => (
                                    <div key={index} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl group hover:border-blue-500/30 transition-all">
                                        {editingItem?.key === 'accountStatuses' && editingItem?.index === index ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editingItem.value}
                                                    onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                                                    className="w-24 bg-white dark:bg-slate-900 border-none outline-none text-xs text-slate-900 dark:text-white uppercase px-1 rounded font-bold"
                                                    autoFocus
                                                />
                                                <button onClick={handleEditSave} className="p-0.5 text-emerald-500 hover:scale-110 transition-transform">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={handleEditCancel} className="p-0.5 text-rose-500 hover:scale-110 transition-transform">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{status}</span>
                                                <button 
                                                    onClick={() => handleEditStart('accountStatuses', index)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-blue-500 hover:scale-110 transition-all"
                                                    title="Alterar"
                                                >
                                                    <Edit3 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newInput.statuses}
                                    onChange={(e) => setNewInput({ ...newInput, statuses: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem('accountStatuses', 'statuses')}
                                    placeholder="Novo Status"
                                    className="flex-1 px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                                <button 
                                    onClick={() => handleAddItem('accountStatuses', 'statuses')}
                                    className="p-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-all"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 border-t border-slate-100 dark:border-slate-800 mt-8">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" size={16} />
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Alterar itens afetará todos os registros novos e existentes globalmente. 
                                    O sistema não permite excluir itens para evitar dados órfãos, mas você pode renomeá-los 
                                    para corrigir erros ou atualizar nomenclaturas.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSettingsView;

