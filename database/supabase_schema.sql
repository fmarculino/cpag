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
-- NOTE: For production, these should be more restrictive.
-- For now, we allow reading and writing for the application to function.

CREATE POLICY "Enable all for users" ON public.users FOR ALL USING (true);

-- Ensure the gen_random_uuid() function is available (Standard in Supabase)
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
