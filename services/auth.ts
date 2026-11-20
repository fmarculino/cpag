import { AuthChangeEvent } from '@supabase/supabase-js';
import { Theme, User, UserRole } from '../types';
import { supabase } from './supabase';

const LEGACY_SESSION_KEY = 'financepro_session';
const LEGACY_SETTINGS_KEY = 'app_settings_local';
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const PROFILE_COLUMNS = 'id, login, full_name, email, role, preferred_theme, created_at';

interface ProfileRow {
  id: string;
  login: string;
  full_name: string;
  email: string;
  role: string;
  preferred_theme: string;
  created_at: string;
}

function mapProfileRow(data: ProfileRow): User {
  return {
    id: data.id,
    login: data.login,
    fullName: data.full_name,
    email: data.email,
    role: data.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER,
    preferredTheme: (data.preferred_theme as Theme) || 'system',
    createdAt: new Date(data.created_at).getTime(),
  };
}

export const authService = {
  fetchUserProfile: async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao carregar perfil do usuário: ${error.message}`);
    }

    if (!data) return null;
    return mapProfileRow(data as ProfileRow);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      return null;
    }

    return authService.fetchUserProfile(data.session.user.id);
  },

  login: async (email: string, password: string): Promise<{ user: User | null; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { user: null, error: 'Informe e-mail e senha.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      return { user: null, error: 'E-mail ou senha inválidos.' };
    }

    try {
      const profile = await authService.fetchUserProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return { user: null, error: 'Perfil de usuário não encontrado. Contate o administrador.' };
      }
      return { user: profile };
    } catch {
      await supabase.auth.signOut();
      return { user: null, error: 'Não foi possível carregar o perfil do usuário.' };
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem(LEGACY_SESSION_KEY);
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Erro ao encerrar sessão: ${error.message}`);
    }
  },

  requestPasswordReset: async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { success: false, error: 'Informe um e-mail válido.' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: window.location.origin,
    });

    if (error) {
      return {
        success: false,
        error: 'Não foi possível enviar o e-mail de recuperação. Verifique a configuração SMTP ou tente mais tarde.',
      };
    }

    return { success: true };
  },

  updatePassword: async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
      return {
        success: false,
        error: 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.',
      };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: 'Não foi possível redefinir a senha. O link pode ter expirado.' };
    }

    return { success: true };
  },

  onAuthStateChange: (
    callback: (event: AuthChangeEvent, sessionUserId: string | null) => void
  ): (() => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user?.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  },
};
