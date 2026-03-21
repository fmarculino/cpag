import JSZip from 'jszip';
import { storageService } from './storage';
import { userService } from './userService';
import { settingsService } from './settingsService';
import { SystemSettings } from '../types';

export const backupService = {
  /**
   * Export all system data (accounts, users, settings) to a ZIP file
   */
  async exportBackup(settings: SystemSettings): Promise<void> {
    const zip = new JSZip();

    // 1. Get Accounts
    const accounts = await storageService.getAccounts();
    zip.file('accounts.json', JSON.stringify(accounts, null, 2));

    // 2. Get Users (complete data for migration)
    const users = await userService.getUsersForBackup();
    zip.file('users.json', JSON.stringify(users, null, 2));

    // 3. Get Settings
    zip.file('settings.json', JSON.stringify(settings, null, 2));

    // 4. Metadata
    const metadata = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      system: 'CPAG - Contas a Pagar',
      localStorage: {}
    };
    zip.file('backup_metadata.json', JSON.stringify(metadata, null, 2));

    // Generate ZIP
    const content = await zip.generateAsync({ type: 'blob' });

    // Download file
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

  /**
   * Import system data from a backup ZIP file
   */
  async importBackup(file: File): Promise<{ restoredCount: number; settings?: SystemSettings }> {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    
    let restoredCount = 0;
    let settings: SystemSettings | undefined;

    // 1. Restore Accounts
    if (loadedZip.file('accounts.json')) {
      const accountsData = JSON.parse(await loadedZip.file('accounts.json')!.async('string'));
      await storageService.saveAccounts(accountsData);
      restoredCount++;
    }

    // 2. Restore Users
    if (loadedZip.file('users.json')) {
      const usersData = JSON.parse(await loadedZip.file('users.json')!.async('string'));
      await userService.restoreUsers(usersData);
      restoredCount++;
    }

    // 3. Restore Settings
    if (loadedZip.file('settings.json')) {
      const settingsData = JSON.parse(await loadedZip.file('settings.json')!.async('string'));
      await settingsService.updateSettings(settingsData);
      settings = settingsData;
      restoredCount++;
    }

    // 4. Restore localStorage metadata if present
    if (loadedZip.file('backup_metadata.json')) {
      const metaData = JSON.parse(await loadedZip.file('backup_metadata.json')!.async('string'));
      if (metaData.localStorage) {
        Object.entries(metaData.localStorage as Record<string, string>).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      }
    }

    return { restoredCount, settings };
  }
};
