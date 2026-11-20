-- ============================================================================
-- 01_schema_secure.sql — FinancePro Secure Database Schema (Single-Company)
-- Target: PostgreSQL / Supabase (Self-Hosted)
-- Execute in order: 01_schema_secure.sql -> 02_rls_and_storage.sql -> 03_audit_triggers.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Perfis de usuários vinculados ao Supabase Auth (auth.users)
-- Nenhuma senha ou hash é armazenado em public.profiles.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login text NOT NULL UNIQUE CHECK (char_length(trim(login)) BETWEEN 3 AND 50),
  full_name text NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  preferred_theme text NOT NULL DEFAULT 'system' CHECK (preferred_theme IN ('light', 'dark', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Contas a Pagar
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_movimento date NOT NULL,
  local text NOT NULL DEFAULT '',
  fornecedor text NOT NULL,
  titulo text NOT NULL DEFAULT '',
  empresa text NOT NULL DEFAULT '',
  vencimento date NOT NULL,
  valor numeric(14, 2) NOT NULL CHECK (valor >= 0),
  tipo text NOT NULL,
  categoria text NOT NULL,
  status text NOT NULL,
  observacao text NOT NULL DEFAULT '',
  anexos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(anexos) = 'array'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounts_vencimento ON public.accounts(vencimento);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_categoria ON public.accounts(categoria);
CREATE INDEX IF NOT EXISTS idx_accounts_created_by ON public.accounts(created_by);

-- 3. Configurações Globais do Sistema (singleton id = 'default')
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  company_name text NOT NULL DEFAULT 'FinancePro',
  currency_symbol text NOT NULL DEFAULT 'R$',
  date_format text NOT NULL DEFAULT 'dd/MM/yyyy' CHECK (date_format IN ('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')),
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  account_types text[] NOT NULL DEFAULT ARRAY['DESPESA', 'COMPRA'],
  account_categories text[] NOT NULL DEFAULT ARRAY[
    'OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS',
    'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'
  ],
  account_statuses text[] NOT NULL DEFAULT ARRAY['PENDENTE', 'PAGO', 'CANCELADO'],
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 4. Trilha de Auditoria (append-only via triggers)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_created ON public.audit_logs(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs(actor_id, created_at DESC);
