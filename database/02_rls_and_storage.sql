-- ============================================================================
-- 02_rls_and_storage.sql — Strict Row Level Security & Private Storage Bucket
-- Execute after 01_schema_secure.sql
-- ============================================================================

-- 1. Bloquear qualquer acesso anônimo às tabelas públicas
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles, public.accounts, public.system_settings TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- 2. Função auxiliar segura para verificação de perfil ADMIN (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Ativar Row Level Security em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS: public.profiles
-- Somente o próprio usuário lê seu perfil, ou um ADMIN lê todos.
DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin_only" ON public.profiles;
CREATE POLICY "profiles_insert_admin_only"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Usuário comum pode atualizar apenas o próprio registro (campos protegidos por trigger em 03_audit_triggers.sql)
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON public.profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Políticas RLS: public.accounts
-- Empresa única: todos os usuários autenticados consultam contas; somente ADMIN cria, edita ou exclui.
DROP POLICY IF EXISTS "accounts_select_authenticated" ON public.accounts;
CREATE POLICY "accounts_select_authenticated"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "accounts_insert_admin_only" ON public.accounts;
CREATE POLICY "accounts_insert_admin_only"
  ON public.accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "accounts_update_admin_only" ON public.accounts;
CREATE POLICY "accounts_update_admin_only"
  ON public.accounts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "accounts_delete_admin_only" ON public.accounts;
CREATE POLICY "accounts_delete_admin_only"
  ON public.accounts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 6. Políticas RLS: public.system_settings
-- Todos autenticados leem configurações de exibição; somente ADMIN altera.
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.system_settings;
CREATE POLICY "settings_select_authenticated"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_insert_admin_only" ON public.system_settings;
CREATE POLICY "settings_insert_admin_only"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_update_admin_only" ON public.system_settings;
CREATE POLICY "settings_update_admin_only"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings_delete_admin_only" ON public.system_settings;
CREATE POLICY "settings_delete_admin_only"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Políticas RLS: public.audit_logs
-- Somente leitura para ADMIN; gravação exclusiva via triggers SECURITY DEFINER.
DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin_only"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 8. Storage Privado: bucket 'attachments'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

DROP POLICY IF EXISTS "attachments_select_authenticated" ON storage.objects;
CREATE POLICY "attachments_select_authenticated"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_insert_admin_only" ON storage.objects;
CREATE POLICY "attachments_insert_admin_only"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments' AND public.is_admin());

DROP POLICY IF EXISTS "attachments_update_admin_only" ON storage.objects;
CREATE POLICY "attachments_update_admin_only"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'attachments' AND public.is_admin())
  WITH CHECK (bucket_id = 'attachments' AND public.is_admin());

DROP POLICY IF EXISTS "attachments_delete_admin_only" ON storage.objects;
CREATE POLICY "attachments_delete_admin_only"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments' AND public.is_admin());
