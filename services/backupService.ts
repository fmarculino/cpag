import JSZip from 'jszip';
import { z } from 'zod';
import { Account, SystemSettings, UserRole } from '../types';
import { authService } from './auth';
import { settingsService } from './settingsService';
import { storageService } from './storage';

const MAX_ZIP_SIZE = 10 * 1024 * 1024;
const MAX_JSON_SIZE = 20 * 1024 * 1024;
const MAX_ACCOUNTS = 50000;

const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const AttachmentBackupSchema = z.object({
  name: z.string().min(1).max(255),
  path: z
    .string()
    .min(1)
    .max(500)
    .refine((val) => !val.startsWith('/') && !val.includes('..') && !val.includes('\\'), {
      message: 'Caminho de anexo inválido.',
    }),
  size: z.number().finite().nonnegative().max(5 * 1024 * 1024),
  type: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
});

const AccountBackupSchema = z.object({
  id: z.string().uuid(),
  dataMovimento: z.string().regex(DATE_ISO_REGEX, 'Data de movimento inválida (use YYYY-MM-DD).'),
  local: z.string().max(255),
  fornecedor: z.string().min(1).max(255),
  titulo: z.string().max(255),
  empresa: z.string().max(255),
  vencimento: z.string().regex(DATE_ISO_REGEX, 'Data de vencimento inválida (use YYYY-MM-DD).'),
  valor: z.number().finite().nonnegative(),
  tipo: z.string().min(1).max(64),
  categoria: z.string().min(1).max(64),
  status: z.string().min(1).max(64),
  observacao: z.string().max(2000).optional().default(''),
  createdAt: z.union([
    z.number().finite().nonnegative(),
    z.string().transform((val) => {
      const parsed = new Date(val).getTime();
      if (!Number.isFinite(parsed)) {
        throw new Error('Data de criação inválida.');
      }
      return parsed;
    }),
  ]),
  anexos: z.array(AttachmentBackupSchema).optional().default([]),
});

const AccountsBackupArraySchema = z.array(AccountBackupSchema).max(MAX_ACCOUNTS);

const SystemSettingsBackupSchema = z.object({
  companyName: z.string().min(1).max(120),
  currencySymbol: z.string().min(1).max(10),
  dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
  theme: z.enum(['light', 'dark', 'system']),
  accountTypes: z.array(z.string().min(1).max(64)).min(1).max(50),
  accountCategories: z.array(z.string().min(1).max(64)).min(1).max(100),
  accountStatuses: z.array(z.string().min(1).max(64)).min(1).max(50),
});

async function assertAdminUser(): Promise<void> {
  const user = await authService.getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Error('Apenas administradores podem exportar ou restaurar backups.');
  }
}

async function readZipJsonSafe(entry: JSZip.JSZipObject, fileName: string): Promise<unknown> {
  const text = await entry.async('string');
  if (text.length > MAX_JSON_SIZE) {
    throw new Error(`Arquivo "${fileName}" excede o tamanho máximo permitido para JSON.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Arquivo "${fileName}" contém JSON inválido.`);
  }
}

export const backupService = {
  async exportBackup(settings: SystemSettings): Promise<void> {
    await assertAdminUser();

    const zip = new JSZip();
    const accounts = await storageService.getAccounts();
    zip.file('accounts.json', JSON.stringify(accounts, null, 2));

    const safeSettings: SystemSettings = {
      companyName: settings.companyName,
      currencySymbol: settings.currencySymbol,
      dateFormat: settings.dateFormat,
      theme: settings.theme,
      accountTypes: settings.accountTypes,
      accountCategories: settings.accountCategories,
      accountStatuses: settings.accountStatuses,
    };
    zip.file('settings.json', JSON.stringify(safeSettings, null, 2));

    const metadata = {
      exportedAt: new Date().toISOString(),
      version: '3.0',
      system: 'FinancePro - Contas a Pagar',
    };
    zip.file('backup_metadata.json', JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `backup_cpag_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async importBackup(file: File): Promise<{ restoredCount: number; settings?: SystemSettings }> {
    await assertAdminUser();

    if (file.size <= 0 || file.size > MAX_ZIP_SIZE) {
      throw new Error('Arquivo de backup inválido ou acima do limite de 10MB.');
    }

    const zip = new JSZip();
    let loadedZip: JSZip;
    try {
      loadedZip = await zip.loadAsync(file);
    } catch {
      throw new Error('Arquivo ZIP inválido ou corrompido.');
    }

    const accountsEntry = loadedZip.file('accounts.json');
    const settingsEntry = loadedZip.file('settings.json');

    if (!accountsEntry && !settingsEntry) {
      throw new Error('Backup inválido: accounts.json e settings.json ausentes.');
    }

    let validatedAccounts: Account[] | undefined;
    let validatedSettings: SystemSettings | undefined;

    if (accountsEntry) {
      const rawAccounts = await readZipJsonSafe(accountsEntry, 'accounts.json');
      const parsed = AccountsBackupArraySchema.safeParse(rawAccounts);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new Error(
          `Dados inválidos em accounts.json (${firstIssue?.path.join('.') || 'raiz'}: ${firstIssue?.message || 'formato inválido'}).`
        );
      }
      validatedAccounts = parsed.data as Account[];
    }

    if (settingsEntry) {
      const rawSettings = await readZipJsonSafe(settingsEntry, 'settings.json');
      const parsed = SystemSettingsBackupSchema.safeParse(rawSettings);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        throw new Error(
          `Dados inválidos em settings.json (${firstIssue?.path.join('.') || 'raiz'}: ${firstIssue?.message || 'formato inválido'}).`
        );
      }
      validatedSettings = parsed.data as SystemSettings;
    }

    let restoredCount = 0;

    if (validatedAccounts) {
      await storageService.saveAccounts(validatedAccounts);
      restoredCount += 1;
    }

    if (validatedSettings) {
      await settingsService.updateSettings(validatedSettings);
      restoredCount += 1;
    }

    return { restoredCount, settings: validatedSettings };
  },
};
