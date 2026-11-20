-- ============================================================================
-- 03_audit_triggers.sql — Profile Sync, Field Protection & Audit Logging
-- Execute after 02_rls_and_storage.sql
-- ============================================================================

-- 1. Atualização automática de updated_at em public.profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 2. Atualização automática de updated_at e updated_by em accounts / system_settings
CREATE OR REPLACE FUNCTION public.set_updated_audit_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), OLD.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_updated_audit ON public.accounts;
CREATE TRIGGER trg_accounts_updated_audit
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_audit_fields();

DROP TRIGGER IF EXISTS trg_settings_updated_audit ON public.system_settings;
CREATE TRIGGER trg_settings_updated_audit
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_audit_fields();

-- 3. Proteção contra auto-promoção de privilégio ou alteração cadastral por usuário USER
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin')
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.login IS DISTINCT FROM OLD.login THEN
      RAISE EXCEPTION 'Apenas administradores podem alterar id, role, email ou login do perfil.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_fields ON public.profiles;
CREATE TRIGGER trg_profiles_protect_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- 4. Criação automática de perfil quando um usuário nasce em auth.users
-- IMPORTANTE: o papel (role) vem exclusivamente de raw_app_meta_data (nunca de raw_user_meta_data).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login text;
  v_full_name text;
  v_role text;
BEGIN
  v_login := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'login'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'user'
  );
  v_login := left(v_login, 40);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE login = v_login) THEN
    v_login := left(v_login, 31) || '_' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;

  v_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    v_login
  );
  IF char_length(v_full_name) < 2 THEN
    v_full_name := 'Usuário FinancePro';
  END IF;

  v_role := upper(COALESCE(NEW.raw_app_meta_data->>'role', 'USER'));
  IF v_role NOT IN ('ADMIN', 'USER') THEN
    v_role := 'USER';
  END IF;

  INSERT INTO public.profiles (id, login, full_name, email, role, preferred_theme)
  VALUES (NEW.id, v_login, v_full_name, NEW.email, v_role, 'system')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. Sincronização de e-mail quando alterado via auth.users
CREATE OR REPLACE FUNCTION public.sync_auth_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_user_email();

-- 6. Trilha de Auditoria em accounts, profiles e system_settings
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::text;
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id::text;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  ELSE
    v_record_id := NEW.id::text;
    v_old := NULL;
    v_new := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, actor_id, old_data, new_data)
  VALUES (TG_TABLE_NAME, v_record_id, TG_OP, auth.uid(), v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_accounts ON public.accounts;
CREATE TRIGGER trg_audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_system_settings ON public.system_settings;
CREATE TRIGGER trg_audit_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- ============================================================================
-- BOOTSTRAP DO PRIMEIRO ADMINISTRADOR (SEM SENHA HARDCODED)
-- 1. Crie o primeiro usuário no Supabase Studio (Authentication -> Users -> Add user)
--    definindo um e-mail real e uma senha forte gerada na hora.
-- 2. Em seguida, promova-o para ADMIN executando os comandos abaixo no SQL Editor:
--
-- UPDATE auth.users
-- SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb
-- WHERE email = 'admin@seudominio.com';
--
-- UPDATE public.profiles
-- SET role = 'ADMIN', login = 'admin', full_name = 'Administrador Master'
-- WHERE email = 'admin@seudominio.com';
-- ============================================================================
