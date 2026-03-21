import { supabase } from './supabase';
import { SystemSettings, Theme } from '../types';

const STORAGE_KEY = 'app_settings_local';

export const settingsService = {
    getSettings: async (): Promise<SystemSettings> => {
        // Try local storage first (cached)
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
            try {
                return JSON.parse(local);
            } catch (e) {
                console.error('Error parsing local settings:', e);
            }
        }

        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'default')
            .single();

        let settings: SystemSettings;

        if (data) {
            settings = {
                companyName: data.company_name || 'Agência Antigravity',
                currencySymbol: data.currency_symbol || 'R$',
                dateFormat: data.date_format || 'dd/MM/yyyy',
                theme: (data.theme as Theme) || 'system',
                accountTypes: data.account_types || ['DESPESA', 'COMPRA'],
                accountCategories: data.account_categories || ['OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS', 'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'],
                accountStatuses: data.account_statuses || ['PENDENTE', 'PAGO', 'CANCELADO']
            };
        } else {
            // Default fallback
            settings = {
                companyName: 'Agência Antigravity',
                currencySymbol: 'R$',
                dateFormat: 'dd/MM/yyyy',
                theme: 'system',
                accountTypes: ['DESPESA', 'COMPRA'],
                accountCategories: ['OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS', 'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'],
                accountStatuses: ['PENDENTE', 'PAGO', 'CANCELADO']
            };
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return settings;
    },

    updateSettings: async (settings: SystemSettings): Promise<void> => {
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                id: 'default',
                company_name: settings.companyName,
                currency_symbol: settings.currencySymbol,
                date_format: settings.dateFormat,
                theme: settings.theme,
                account_types: settings.accountTypes,
                account_categories: settings.accountCategories,
                account_statuses: settings.accountStatuses,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error saving settings to Supabase, saving locally only:', error);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        
        // Trigger theme change globally
        if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
};
