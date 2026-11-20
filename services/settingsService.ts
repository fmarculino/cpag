import { SystemSettings, Theme } from '../types';
import { supabase } from './supabase';

const SETTINGS_COLUMNS =
  'id, company_name, currency_symbol, date_format, theme, account_types, account_categories, account_statuses, updated_at';

const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'FinancePro',
  currencySymbol: 'R$',
  dateFormat: 'dd/MM/yyyy',
  theme: 'system',
  accountTypes: ['DESPESA', 'COMPRA'],
  accountCategories: [
    'OUTROS',
    'ENERGIA',
    'ALUGUEL',
    'SALARIOS',
    'IMPOSTOS',
    'MERCADORIA',
    'MARKETING',
    'MANUTENCAO',
    'SOFTWARE',
  ],
  accountStatuses: ['PENDENTE', 'PAGO', 'CANCELADO'],
};

function applyThemeClass(theme: Theme): void {
  if (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export const settingsService = {
  getSettings: async (): Promise<SystemSettings> => {
    const { data, error } = await supabase
      .from('system_settings')
      .select(SETTINGS_COLUMNS)
      .eq('id', 'default')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { ...DEFAULT_SETTINGS };
      }
      throw new Error(`Erro ao carregar configurações: ${error.message}`);
    }

    if (!data) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      companyName: data.company_name || DEFAULT_SETTINGS.companyName,
      currencySymbol: data.currency_symbol || DEFAULT_SETTINGS.currencySymbol,
      dateFormat: data.date_format || DEFAULT_SETTINGS.dateFormat,
      theme: (data.theme as Theme) || DEFAULT_SETTINGS.theme,
      accountTypes: data.account_types || DEFAULT_SETTINGS.accountTypes,
      accountCategories: data.account_categories || DEFAULT_SETTINGS.accountCategories,
      accountStatuses: data.account_statuses || DEFAULT_SETTINGS.accountStatuses,
    };
  },

  updateSettings: async (settings: SystemSettings): Promise<void> => {
    const { error } = await supabase.from('system_settings').upsert({
      id: 'default',
      company_name: settings.companyName,
      currency_symbol: settings.currencySymbol,
      date_format: settings.dateFormat,
      theme: settings.theme,
      account_types: settings.accountTypes,
      account_categories: settings.accountCategories,
      account_statuses: settings.accountStatuses,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao salvar configurações no servidor: ${error.message}`);
    }

    applyThemeClass(settings.theme);
  },
};
