
export enum AccountStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO'
}

export enum AccountType {
  DESPESA = 'DESPESA',
  COMPRA = 'COMPRA'
}

export enum AccountCategory {
  OUTROS = 'OUTROS',
  ENERGIA = 'ENERGIA',
  ALUGUEL = 'ALUGUEL',
  SALARIOS = 'SALARIOS',
  IMPOSTOS = 'IMPOSTOS',
  MERCADORIA = 'MERCADORIA',
  MARKETING = 'MARKETING',
  MANUTENCAO = 'MANUTENCAO',
  SOFTWARE = 'SOFTWARE'
}

export interface Account {
  id: string;
  dataMovimento: string;
  local: string;
  fornecedor: string;
  titulo: string;
  empresa: string;
  vencimento: string;
  valor: number;
  tipo: AccountType;
  categoria: AccountCategory;
  status: AccountStatus;
  observacao: string;
  createdAt: number;
}

export type AccountFormData = Omit<Account, 'id' | 'createdAt'>;

export interface DashboardStats {
  totalPendente: number;
  totalPago: number;
  countPendente: number;
  countPago: number;
  countCancelado: number;
  totalGeral: number;
}
