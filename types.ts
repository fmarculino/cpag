export enum AccountStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO'
}

export type Theme = 'light' | 'dark' | 'system';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  login: string;
  fullName: string;
  email: string;
  role: UserRole;
  preferredTheme: Theme;
  createdAt: number;
}

export type UserFormData = Omit<User, 'id' | 'createdAt' | 'preferredTheme'> & { password: string };

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

export interface Attachment {
  name: string;
  path: string;
  size: number;
  type: string;
  url?: string;
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
  anexos?: Attachment[];
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

export interface SystemSettings {
  companyName: string;
  currencySymbol: string;
  dateFormat: string;
  logoUrl?: string;
  theme: Theme;
  accountTypes: string[];
  accountCategories: string[];
  accountStatuses: string[];
}
