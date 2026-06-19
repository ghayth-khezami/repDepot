import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LoginFloatingStickers } from '../components/LoginFloatingStickers';
import { APP_NAME, APP_SUBTITLE, LOGO_URL } from '../lib/brand';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await login({ email, password }).unwrap();
      if (res.user.role !== 'ADMIN') {
        showToast('Accès réservé aux administrateurs', 'error');
        return;
      }
      setAuth(res.access_token, res.user);
      showToast('Connexion réussie', 'success');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const status = (err as { status?: number | string })?.status;
      if (status === 'FETCH_ERROR' || status === 0) {
        showToast('Impossible de joindre l\'API — vérifiez VITE_API_URL et MOBILE_URL (CORS)', 'error');
      } else {
        showToast('Email ou mot de passe incorrect', 'error');
      }
    }
  };

  return (
    <div className="login-screen relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100 via-lavender-50 to-amber-50 px-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <LoginFloatingStickers />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-primary-100 bg-white/95 p-8 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-8 text-center">
          <img src={LOGO_URL} alt={APP_NAME} className="mx-auto mb-4 h-28 w-28 object-contain" />
          <h1 className="text-xl font-bold text-primary-800 dark:text-primary-200">{APP_NAME}</h1>
          <p className="text-xs uppercase tracking-wider text-gray-500">{APP_SUBTITLE}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
              placeholder="admin@bebe-depot.com"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium">
            Mot de passe
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-600 dark:bg-slate-800"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary-600 py-3.5 font-semibold text-white shadow-md disabled:opacity-60"
          >
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
