import React, { useState, useEffect } from 'react';
import { X, Plus, Edit2, Check, Save } from 'lucide-react';
import { SystemSettings } from '../types';
import { settingsService } from '../services/settingsService';

interface SettingsMenuProps {
    onClose: () => void;
    onSettingsUpdated: (settings: SystemSettings) => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ onClose, onSettingsUpdated }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Field edit states
    const [newInput, setNewInput] = useState<{ [key: string]: string }>({ types: '', categories: '', statuses: '' });
    const [editingIndex, setEditingIndex] = useState<{ key: string, index: number } | null>(null);
    const [editValue, setEditValue] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await settingsService.getSettings();
            setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async (updatedSettings: SystemSettings) => {
        setSaving(true);
        await settingsService.updateSettings(updatedSettings);
        setSettings(updatedSettings);
        onSettingsUpdated(updatedSettings);
        setSaving(false);
    };

    const handleAdd = (key: keyof SystemSettings, inputKey: string) => {
        if (!settings || !newInput[inputKey].trim()) return;

        // Check for uppercase since we prefer standardizing data formats
        const uppercaseVal = newInput[inputKey].trim().toUpperCase();

        const updated = {
            ...settings,
            [key]: [...settings[key], uppercaseVal]
        };

        setNewInput(prev => ({ ...prev, [inputKey]: '' }));
        handleSave(updated);
    };

    const handleEditInit = (key: keyof SystemSettings, index: number) => {
        setEditingIndex({ key, index });
        setEditValue(settings![key][index]);
    };

    const handleEditSave = () => {
        if (!settings || !editingIndex || !editValue.trim()) {
            setEditingIndex(null);
            return;
        }

        const { key, index } = editingIndex;
        const keyRef = key as keyof SystemSettings;
        const arr = [...settings[keyRef]];
        arr[index] = editValue.trim().toUpperCase();

        const updated = { ...settings, [keyRef]: arr };
        setEditingIndex(null);
        handleSave(updated);
    };

    if (loading || !settings) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    const renderSection = (title: string, dataKey: keyof SystemSettings, inputKey: string) => {
        const isEditingKey = (idx: number) => editingIndex?.key === dataKey && editingIndex?.index === idx;

        return (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>

                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {settings[dataKey].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            {isEditingKey(idx) ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white"
                                        autoFocus
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                                    />
                                    <button onClick={handleEditSave} className="p-1.5 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingIndex(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                                    <button onClick={() => handleEditInit(dataKey, idx)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Novo item..."
                        value={newInput[inputKey]}
                        onChange={(e) => setNewInput({ ...newInput, [inputKey]: e.target.value })}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none dark:text-slate-100"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd(dataKey, inputKey)}
                    />
                    <button
                        onClick={() => handleAdd(dataKey, inputKey)}
                        disabled={saving || !newInput[inputKey].trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Configurações de Cadastros</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie os status e categorias disponíveis (não é permitido excluir tipos existentes).</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderSection('Contas Contábeis', 'accountTypes', 'types')}
                        {renderSection('Categorias', 'accountCategories', 'categories')}
                        {renderSection('Status de Conta', 'accountStatuses', 'statuses')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
