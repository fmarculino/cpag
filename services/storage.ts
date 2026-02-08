
import { Account } from '../types';

const STORAGE_KEY = 'finance_pro_accounts';

export const storageService = {
  getAccounts: (): Account[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveAccounts: (accounts: Account[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  },

  addAccount: (account: Account): void => {
    const accounts = storageService.getAccounts();
    accounts.push(account);
    storageService.saveAccounts(accounts);
  },

  updateAccount: (updatedAccount: Account): void => {
    const accounts = storageService.getAccounts();
    const index = accounts.findIndex(a => a.id === updatedAccount.id);
    if (index !== -1) {
      accounts[index] = updatedAccount;
      storageService.saveAccounts(accounts);
    }
  },

  deleteAccounts: (ids: string[]): void => {
    const accounts = storageService.getAccounts();
    const filtered = accounts.filter(a => !ids.includes(a.id));
    storageService.saveAccounts(filtered);
  },

  updateStatusBulk: (ids: string[], status: any): void => {
    const accounts = storageService.getAccounts();
    const updated = accounts.map(a => ids.includes(a.id) ? { ...a, status } : a);
    storageService.saveAccounts(updated);
  }
};
