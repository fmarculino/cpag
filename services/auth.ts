
import { User, UserRole } from '../types';
import { supabase } from './supabase';
import { userService } from './userService';
import bcrypt from 'bcryptjs';

const SESSION_KEY = 'financepro_session';

export const authService = {
    getCurrentUser: (): User | null => {
        const session = localStorage.getItem(SESSION_KEY);
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch (e) {
            return null;
        }
    },

    login: async (login: string, password: string): Promise<{ user: User | null; error?: string }> => {
        // Especial check for initial admin if no users exist
        const { data: users, error: checkError } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (!users || users.length === 0) {
            if (login === 'admin' && password === 'admin') {
                // Create initial admin
                const createRes = await userService.createUser({
                    login: 'admin',
                    fullName: 'Administrador Master',
                    email: 'admin@financepro.com',
                    password: 'Admin@123', // Satisfies regex
                    role: UserRole.ADMIN
                });

                if (createRes.success) {
                    // Retry login with the new admin
                    return authService.login(login, 'Admin@123');
                }
            }
        }

        // Normal login
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('login', login)
            .single();

        if (error || !data) {
            return { user: null, error: 'Usuário ou senha inválidos.' };
        }

        const passwordMatch = await bcrypt.compare(password, data.password);
        if (!passwordMatch) {
            return { user: null, error: 'Usuário ou senha inválidos.' };
        }

        const user: User = {
            id: data.id,
            login: data.login,
            fullName: data.full_name,
            email: data.email,
            role: data.role as UserRole,
            preferredTheme: data.preferred_theme,
            createdAt: data.created_at
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return { user };
    },

    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    updateSession: (user: User) => {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    }
};
