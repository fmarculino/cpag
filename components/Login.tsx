import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import { authService } from '../services/auth';
import { User } from '../types';

type LoginMode = 'login' | 'forgot' | 'reset';

interface LoginProps {
  onLogin: (user: User) => void;
  initialMode?: LoginMode;
  onPasswordUpdated?: () => Promise<void> | void;
  onCancelReset?: () => Promise<void> | void;
}

const Login: React.FC<LoginProps> = ({
  onLogin,
  initialMode = 'login',
  onPasswordUpdated,
  onCancelReset,
}) => {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  }, [initialMode]);

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { user, error: loginError } = await authService.login(email, password);
        if (loginError) {
          setError(loginError);
        } else if (user) {
          onLogin(user);
        }
      } else if (mode === 'forgot') {
        const res = await authService.requestPasswordReset(email);
        if (res.success) {
          setSuccess(
            'Se o e-mail estiver cadastrado, enviaremos um link temporário para redefinição de senha.'
          );
        } else {
          setError(res.error || 'Não foi possível enviar o e-mail de recuperação.');
        }
      } else {
        if (password !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
        }
        const res = await authService.updatePassword(password);
        if (res.success) {
          setSuccess('Senha atualizada com sucesso!');
          setPassword('');
          setConfirmPassword('');
          if (onPasswordUpdated) {
            await onPasswordUpdated();
          } else {
            setMode('login');
          }
        } else {
          setError(res.error || 'Erro ao atualizar a senha.');
        }
      }
    } catch {
      setError('Ocorreu um erro ao processar sua solicitação.');
    } finally {
      setIsLoading(false);
    }
  };

  const subtitle =
    mode === 'login'
      ? 'Acesse sua conta com e-mail e senha'
      : mode === 'forgot'
      ? 'Informe seu e-mail para receber o link de recuperação'
      : 'Defina sua nova senha de acesso';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/30 mb-4">
            <PieIcon className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">FinancePro</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{subtitle}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {(error || success) && (
                <div
                  className={`p-4 border rounded-2xl flex items-center gap-3 text-sm animate-in fade-in zoom-in duration-300 ${
                    success
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-600 dark:text-red-300'
                  }`}
                >
                  {success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <p>{error || success}</p>
                </div>
              )}

              {(mode === 'login' || mode === 'forgot') && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'reset') && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    {mode === 'login' ? 'Senha' : 'Nova Senha'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      placeholder={mode === 'login' ? 'Sua senha' : 'Mínimo 8 caracteres fortes'}
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPassword(!showPassword);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-20"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'reset' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowConfirmPassword(!showConfirmPassword);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors z-20"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 px-1">
                    Use ao menos 8 caracteres com maiúsculas, minúsculas, números e símbolos.
                  </p>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-500/25 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      Entrar no Sistema
                    </>
                  ) : mode === 'forgot' ? (
                    <>
                      <Mail className="w-5 h-5" />
                      Enviar Link de Recuperação
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                      Salvar Nova Senha
                    </>
                  )}
                </button>

                {mode !== 'login' && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (mode === 'reset' && onCancelReset) {
                        await onCancelReset();
                      }
                      switchMode('login');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para o Login
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-center text-slate-400 dark:text-slate-600">
              © 2026 FinancePro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
