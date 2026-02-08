
import { User, UserFormData, UserRole } from '../types';
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export const userService = {
    getUsers: async (): Promise<User[]> => {
        const { data, error } = await supabase
            .from('users')
            .select('id, login, full_name, email, role, preferred_theme, created_at')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return data.map(u => ({
            id: u.id,
            login: u.login,
            fullName: u.full_name,
            email: u.email,
            role: u.role as UserRole,
            preferredTheme: u.preferred_theme,
            createdAt: u.created_at
        }));
    },

    createUser: async (data: UserFormData): Promise<{ success: boolean; error?: string }> => {
        // Validate password pattern
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(data.password)) {
            return {
                success: false,
                error: 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.'
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const newUser = {
            login: data.login,
            full_name: data.fullName,
            email: data.email,
            password: hashedPassword,
            role: data.role,
            preferred_theme: 'system',
            created_at: Date.now()
        };

        const { error } = await supabase
            .from('users')
            .insert([newUser]);

        if (error) {
            console.error('Error creating user:', error);
            if (error.code === '23505') return { success: false, error: 'Login ou Email já cadastrado.' };
            return { success: false, error: error.message };
        }

        return { success: true };
    },

    updateUser: async (id: string, data: Partial<UserFormData>): Promise<{ success: boolean; error?: string }> => {
        const updates: any = {
            login: data.login,
            full_name: data.fullName,
            email: data.email,
            role: data.role,
        };

        if (data.password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(data.password)) {
                return {
                    success: false,
                    error: 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.'
                };
            }
            updates.password = await bcrypt.hash(data.password, 10);
        }

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating user:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    },

    deleteUser: async (id: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: error.message };
        }
        return { success: true };
    },

    updatePreferredTheme: async (id: string, theme: string): Promise<void> => {
        const { error } = await supabase
            .from('users')
            .update({ preferred_theme: theme })
            .eq('id', id);

        if (error) console.error('Error updating theme:', error);
    },

    resetPassword: async (login: string, email: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
        // Find user by login and email
        const { data, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('login', login)
            .eq('email', email)
            .single();

        if (fetchError || !data) {
            return { success: false, error: 'Usuário ou e-mail não encontrados.' };
        }

        // Validate new password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return {
                success: false,
                error: 'A senha deve ter no mínimo 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.'
            };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', data.id);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        return { success: true };
    }
};
