
import { Account } from '../types';
import { supabase } from './supabase';

export const storageService = {
  getAccounts: async (): Promise<Account[]> => {
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .range(from, to)
        .order('vencimento', { ascending: true });

      if (error) {
        console.error('Error fetching accounts:', error);
        break;
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.map(item => ({
      id: item.id,
      dataMovimento: item.data_movimento,
      local: item.local,
      fornecedor: item.fornecedor,
      titulo: item.titulo,
      empresa: item.empresa,
      vencimento: item.vencimento,
      valor: Number(item.valor),
      tipo: item.tipo,
      categoria: item.categoria,
      status: item.status,
      observacao: item.observacao,
      createdAt: item.created_at,
      anexos: item.anexos || []
    }));
  },

  saveAccounts: async (accounts: Account[]): Promise<void> => {
    // This method might not be as useful in a real DB as before 
    // unless it's a bulk sync, but I'll keep it for compatibility
    // and implement as an upsert.
    const dbItems = accounts.map(a => ({
      id: a.id,
      data_movimento: a.dataMovimento,
      local: a.local,
      fornecedor: a.fornecedor,
      titulo: a.titulo,
      empresa: a.empresa,
      vencimento: a.vencimento,
      valor: a.valor,
      tipo: a.tipo,
      categoria: a.categoria,
      status: a.status,
      observacao: a.observacao,
      created_at: a.createdAt,
      anexos: a.anexos
    }));

    const { error } = await supabase
      .from('accounts')
      .upsert(dbItems);

    if (error) console.error('Error saving accounts:', error);
  },

  addAccount: async (account: Account): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .insert([{
        id: account.id,
        data_movimento: account.dataMovimento,
        local: account.local,
        fornecedor: account.fornecedor,
        titulo: account.titulo,
        empresa: account.empresa,
        vencimento: account.vencimento,
        valor: account.valor,
        tipo: account.tipo,
        categoria: account.categoria,
        status: account.status,
        observacao: account.observacao,
        created_at: account.createdAt,
        anexos: account.anexos
      }]);

    if (error) console.error('Error adding account:', error);
  },

  addAccounts: async (accounts: Account[]): Promise<void> => {
    const dbItems = accounts.map(account => ({
      id: account.id,
      data_movimento: account.dataMovimento,
      local: account.local,
      fornecedor: account.fornecedor,
      titulo: account.titulo,
      empresa: account.empresa,
      vencimento: account.vencimento,
      valor: account.valor,
      tipo: account.tipo,
      categoria: account.categoria,
      status: account.status,
      observacao: account.observacao,
      created_at: account.createdAt,
      anexos: account.anexos
    }));

    const { error } = await supabase
      .from('accounts')
      .insert(dbItems);

    if (error) console.error('Error adding accounts in bulk:', error);
  },

  updateAccount: async (updatedAccount: Account): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({
        data_movimento: updatedAccount.dataMovimento,
        local: updatedAccount.local,
        fornecedor: updatedAccount.fornecedor,
        titulo: updatedAccount.titulo,
        empresa: updatedAccount.empresa,
        vencimento: updatedAccount.vencimento,
        valor: updatedAccount.valor,
        tipo: updatedAccount.tipo,
        categoria: updatedAccount.categoria,
        status: updatedAccount.status,
        observacao: updatedAccount.observacao,
        anexos: updatedAccount.anexos,
      })
      .eq('id', updatedAccount.id);

    if (error) console.error('Error updating account:', error);
  },

  deleteAccounts: async (ids: string[]): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .in('id', ids);

    if (error) console.error('Error deleting accounts:', error);
  },

  updateStatusBulk: async (ids: string[], status: any): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ status })
      .in('id', ids);

    if (error) console.error('Error updating status:', error);
  }
};
