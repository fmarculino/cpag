import { Theme, User, UserFormData } from '../types';
import { supabase } from './supabase';

const ADMIN_FUNCTION = 'admin-users';

async function extractFunctionError(error: unknown, fallback: string): Promise<string> {
  if (!error || typeof error !== 'object') return fallback;

  const maybeContext = (error as { context?: unknown }).context;
  if (maybeContext && typeof (maybeContext as Response).json === 'function') {
    try {
      const parsed = await (maybeContext as Response).clone().json();
      if (parsed && typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
        return parsed.error;
      }
    } catch {
      // Ignore invalid JSON response bodies
    }
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim().length > 0 && !message.includes('non-2xx')) {
    return message;
  }

  return fallback;
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.functions.invoke<{ users?: User[]; error?: string }>(
      ADMIN_FUNCTION,
      { body: { action: 'list' } }
    );

    if (error) {
      throw new Error(await extractFunctionError(error, 'Erro ao carregar usuários.'));
    }
    if (data?.error) {
      throw new Error(data.error);
    }

    return data?.users ?? [];
  },

  createUser: async (payload: UserFormData): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ user?: User; error?: string }>(
      ADMIN_FUNCTION,
      {
        body: {
          action: 'create',
          login: payload.login,
          fullName: payload.fullName,
          email: payload.email,
          password: payload.password,
          role: payload.role,
        },
      }
    );

    if (error) {
      return {
        success: false,
        error: await extractFunctionError(error, 'Erro ao criar usuário.'),
      };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  },

  updateUser: async (
    id: string,
    payload: Partial<UserFormData>
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ user?: User; error?: string }>(
      ADMIN_FUNCTION,
      {
        body: {
          action: 'update',
          id,
          login: payload.login,
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role,
          ...(payload.password ? { password: payload.password } : {}),
        },
      }
    );

    if (error) {
      return {
        success: false,
        error: await extractFunctionError(error, 'Erro ao atualizar usuário.'),
      };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  },

  deleteUser: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
      ADMIN_FUNCTION,
      {
        body: {
          action: 'delete',
          id,
        },
      }
    );

    if (error) {
      return {
        success: false,
        error: await extractFunctionError(error, 'Erro ao excluir usuário.'),
      };
    }
    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  },

  updatePreferredTheme: async (id: string, theme: Theme): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({ preferred_theme: theme })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar preferência de tema: ${error.message}`);
    }
  },
};
