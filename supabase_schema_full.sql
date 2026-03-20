-- Create the users table for authentication and theme preferences
CREATE TABLE IF NOT EXISTS public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  login text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL, -- This will store bcrypt hashes
  role text NOT NULL CHECK (role IN ('ADMIN', 'USER')),
  preferred_theme text DEFAULT 'system' CHECK (preferred_theme IN ('light', 'dark', 'system')),
  created_at bigint NOT NULL -- Using timestamp as bigint for consistency with client-side Date.now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for public.users
CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true);

-- Create the accounts table
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data_movimento text NOT NULL,
  local text,
  fornecedor text,
  titulo text,
  empresa text,
  vencimento text NOT NULL,
  valor numeric NOT NULL,
  tipo text NOT NULL,
  categoria text NOT NULL,
  status text NOT NULL,
  observacao text,
  created_at bigint NOT NULL,
  anexos jsonb DEFAULT '[]'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Policy for accounts
CREATE POLICY "Enable all for accounts" ON public.accounts FOR ALL USING (true);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'default',
  account_types text[] DEFAULT ARRAY['DESPESA', 'COMPRA'],
  account_categories text[] DEFAULT ARRAY['OUTROS', 'ENERGIA', 'ALUGUEL', 'SALARIOS', 'IMPOSTOS', 'MERCADORIA', 'MARKETING', 'MANUTENCAO', 'SOFTWARE'],
  account_statuses text[] DEFAULT ARRAY['PENDENTE', 'PAGO', 'CANCELADO'],
  updated_at timestamptz DEFAULT now()
);

-- Policy for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for settings" ON public.system_settings FOR ALL USING (true);
