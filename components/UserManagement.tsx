
import React, { useState, useEffect } from 'react';
import { User, UserFormData, UserRole } from '../types';
import { userService } from '../services/userService';
import { UserPlus, Edit2, Trash2, Mail, Shield, X, Check, Save, User as UserIcon, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface UserManagementProps {
    onClose: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userToDelete, setUserToDelete] = useState<{ id: string, login: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [formData, setFormData] = useState<UserFormData>({
        login: '',
        fullName: '',
        email: '',
        password: '',
        role: UserRole.USER
    });

    const loadUsers = async () => {
        setIsLoading(true);
        const data = await userService.getUsers();
        setUsers(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                login: user.login,
                fullName: user.fullName,
                email: user.email,
                password: '', // Password empty when editing
                role: user.role
            });
        } else {
            setEditingUser(null);
            setFormData({
                login: '',
                fullName: '',
                email: '',
                password: '',
                role: UserRole.USER
            });
        }
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.password || !editingUser) {
            if (formData.password !== confirmPassword) {
                setError('As senhas não coincidem.');
                return;
            }
        }

        let result;
        if (editingUser) {
            // Logic for update (passwords only if filled)
            const updateData: any = { ...formData };
            if (!updateData.password) delete updateData.password;
            result = await userService.updateUser(editingUser.id, updateData);
        } else {
            result = await userService.createUser(formData);
        }

        if (result.success) {
            setIsModalOpen(false);
            loadUsers();
        } else {
            setError(result.error || 'Ocorreu um erro.');
        }
    };

    const handleDelete = (id: string, login: string) => {
        if (login === 'admin') {
            alert('O usuário administrador master não pode ser excluído.');
            return;
        }
        setUserToDelete({ id, login });
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(true);
        const res = await userService.deleteUser(userToDelete.id);

        if (res.success) {
            loadUsers();
            setUserToDelete(null);
        } else {
            setError(`Erro ao excluir usuário: ${res.error}`);
        }
        setIsDeleting(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Gestão de Usuários</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Visualize e gerencie quem pode acessar o sistema.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <UserPlus className="w-5 h-5" /> Novo Usuário
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando usuários...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {users.map(user => (
                                <div key={user.id} className="p-6 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-500">
                                                <UserIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-slate-100">{user.fullName}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-500">@{user.login}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleOpenModal(user);
                                                }}
                                                className="p-3 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                                                title="Editar Usuário"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDelete(user.id, user.login);
                                                }}
                                                className="p-3 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                                                title="Excluir Usuário"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                            {user.email}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${user.role === UserRole.ADMIN ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Internal Modal for Create/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                        <form onSubmit={handleSubmit}>
                            <div className="p-8">
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                                    {editingUser ? <Edit2 className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
                                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                                </h3>

                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.fullName}
                                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Login</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.login}
                                                onChange={e => setFormData({ ...formData, login: e.target.value })}
                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                disabled={editingUser?.login === 'admin'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Perfil</label>
                                            <select
                                                value={formData.role}
                                                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                disabled={editingUser?.login === 'admin'}
                                            >
                                                <option value={UserRole.USER}>Usuário</option>
                                                <option value={UserRole.ADMIN}>Administrador</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                                {editingUser ? 'Nova Senha (opcional)' : 'Senha'}
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required={!editingUser}
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder={editingUser ? '••••••••' : 'Senha'}
                                                />
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all z-20"
                                                    title={showPassword ? "Ocultar Senha" : "Mostrar Senha"}
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">
                                                Confirmar Senha
                                            </label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    required={!editingUser && !!formData.password}
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                                    placeholder={editingUser ? '••••••••' : 'Confirmação'}
                                                />
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all z-20"
                                                    title={showConfirmPassword ? "Ocultar Senha" : "Mostrar Senha"}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-1 leading-tight">
                                        Mínimo de 8 caracteres, maiúsculas, minúsculas e símbolos.
                                    </p>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl flex gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {editingUser ? 'Atualizar' : 'Criar Usuário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Delete */}
            {userToDelete && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Excluir Usuário?</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                                Tem certeza que deseja excluir o usuário <strong className="text-slate-900 dark:text-slate-200">"{userToDelete.login}"</strong>? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                            Excluindo...
                                        </>
                                    ) : (
                                        'Sim, Excluir Usuário'
                                    )}
                                </button>
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
