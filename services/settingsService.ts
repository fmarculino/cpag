import { supabase } from './supabase';
import { SystemSettings } from '../types';

export const settingsService = {
    getSettings: async (): Promise<SystemSettings> => {
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'default')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error fetching settings:', error);
        }

        if (data) {
            return {
                accountTypes: data.account_types || ['DESPESA', 'COMPRA'],
                accountCategories: data.account_categories || ['OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS', 'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'],
                accountStatuses: data.account_statuses || ['PENDENTE', 'PAGO', 'CANCELADO']
            };
        }

        // Default fallback locally if missing in DB
        return {
            accountTypes: ['DESPESA', 'COMPRA'],
            accountCategories: ['OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS', 'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'],
            accountStatuses: ['PENDENTE', 'PAGO', 'CANCELADO']
        };
    },

    updateSettings: async (settings: SystemSettings): Promise<void> => {
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                id: 'default',
                account_types: settings.accountTypes,
                account_categories: settings.accountCategories,
                account_statuses: settings.accountStatuses,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }
};
