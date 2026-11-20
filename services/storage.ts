import { Account, AccountCategory, AccountStatus, AccountType, Attachment } from '../types';
import { supabase } from './supabase';

const ACCOUNT_COLUMNS =
  'id, data_movimento, local, fornecedor, titulo, empresa, vencimento, valor, tipo, categoria, status, observacao, created_at, anexos';

interface AccountRow {
  id: string;
  data_movimento: string;
  local: string | null;
  fornecedor: string;
  titulo: string | null;
  empresa: string | null;
  vencimento: string;
  valor: number | string;
  tipo: string;
  categoria: string;
  status: string;
  observacao: string | null;
  created_at: string | number;
  anexos: Attachment[] | null;
}

function sanitizeAttachments(anexos?: Attachment[]): Omit<Attachment, 'url'>[] {
  if (!Array.isArray(anexos)) return [];
  return anexos.map(({ name, path, size, type }) => ({
    name,
    path,
    size,
    type,
  }));
}

function mapAccountRow(item: AccountRow): Account {
  const createdMs =
    typeof item.created_at === 'number'
      ? item.created_at
      : new Date(item.created_at).getTime();

  return {
    id: item.id,
    dataMovimento: item.data_movimento,
    local: item.local || '',
    fornecedor: item.fornecedor,
    titulo: item.titulo || '',
    empresa: item.empresa || '',
    vencimento: item.vencimento,
    valor: Number(item.valor),
    tipo: item.tipo as AccountType,
    categoria: item.categoria as AccountCategory,
    status: item.status as AccountStatus,
    observacao: item.observacao || '',
    createdAt: Number.isFinite(createdMs) ? createdMs : Date.now(),
    anexos: sanitizeAttachments(item.anexos ?? []),
  };
}

function mapAccountToDb(account: Account) {
  return {
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
    created_at: new Date(account.createdAt || Date.now()).toISOString(),
    anexos: sanitizeAttachments(account.anexos),
  };
}

export const storageService = {
  getAccounts: async (): Promise<Account[]> => {
    const pageSize = 1000;
    let allData: AccountRow[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from('accounts')
        .select(ACCOUNT_COLUMNS)
        .range(from, to)
        .order('vencimento', { ascending: true });

      if (error) {
        throw new Error(`Erro ao carregar contas: ${error.message}`);
      }

      if (data && data.length > 0) {
        allData = [...allData, ...(data as AccountRow[])];
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allData.map(mapAccountRow);
  },

  saveAccounts: async (accounts: Account[]): Promise<void> => {
    if (accounts.length === 0) return;

    const dbItems = accounts.map(mapAccountToDb);
    const { error } = await supabase.from('accounts').upsert(dbItems);
    if (error) {
      throw new Error(`Erro ao salvar contas: ${error.message}`);
    }
  },

  addAccount: async (account: Account): Promise<void> => {
    const { error } = await supabase.from('accounts').insert([mapAccountToDb(account)]);
    if (error) {
      throw new Error(`Erro ao criar conta: ${error.message}`);
    }
  },

  addAccounts: async (accounts: Account[]): Promise<void> => {
    if (accounts.length === 0) return;

    const dbItems = accounts.map(mapAccountToDb);
    const { error } = await supabase.from('accounts').insert(dbItems);
    if (error) {
      throw new Error(`Erro ao importar contas em lote: ${error.message}`);
    }
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
        anexos: sanitizeAttachments(updatedAccount.anexos),
      })
      .eq('id', updatedAccount.id);

    if (error) {
      throw new Error(`Erro ao atualizar conta: ${error.message}`);
    }
  },

  deleteAccounts: async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;

    const { error } = await supabase.from('accounts').delete().in('id', ids);
    if (error) {
      throw new Error(`Erro ao excluir contas: ${error.message}`);
    }
  },

  updateStatusBulk: async (ids: string[], status: AccountStatus): Promise<void> => {
    if (ids.length === 0) return;

    const { error } = await supabase.from('accounts').update({ status }).in('id', ids);
    if (error) {
      throw new Error(`Erro ao atualizar status das contas: ${error.message}`);
    }
  },

  renameValue: async (
    column: 'tipo' | 'categoria' | 'status',
    oldValue: string,
    newValue: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ [column]: newValue })
      .eq(column, oldValue);

    if (error) {
      throw new Error(`Erro ao renomear ${column}: ${error.message}`);
    }
  },
};
