import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
    <div className="login-screen relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6">
      <div className="login-screen-bg" aria-hidden />
      <div className="login-screen-wave" aria-hidden />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={LOGO_URL}
            alt={APP_NAME}
            className="mb-5 h-32 w-32 object-contain drop-shadow-2xl"
          />
          <h1 className="text-xl font-bold tracking-[0.15em] text-lavender-300">{APP_NAME}</h1>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.35em] text-white/50">
            {APP_SUBTITLE}
          </p>
        </div>

        <div className="card-soft p-8">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">Bienvenue</h2>
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-soft mt-2"
                placeholder="admin@bebe-depot.com"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-soft mt-2"
              />
            </label>
            <button type="submit" disabled={isLoading} className="btn-pill btn-primary mt-2">
              {isLoading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
