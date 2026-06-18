import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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
    } catch {
      showToast('Email ou mot de passe incorrect', 'error');
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-lavender-50 to-amber-50 px-6 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-sm rounded-3xl border border-primary-100 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
        <div className="mb-8 text-center">
          <img src="/logo.jpg" alt="" className="mx-auto mb-4 h-24 w-24 rounded-2xl object-cover shadow-md" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-2xl font-bold text-primary-800 dark:text-primary-200">BÉBÉ-DÉPÔT</h1>
          <p className="text-sm text-gray-500">Application admin mobile</p>
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
              placeholder="admin@example.com"
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
            />
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary-600 py-3.5 font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
