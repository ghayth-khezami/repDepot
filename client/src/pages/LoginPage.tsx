import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/authApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import depotLogo from '../depot.jpg';
import { PostLoginLoadingOverlay } from '../components/PostLoginLoadingOverlay'

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const { login: setAuth, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [showPostLoginLoading, setShowPostLoginLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && !showPostLoginLoading) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, showPostLoginLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login({ email, password }).unwrap();
      setAuth(result.access_token, result.user);
      showToast('Connexion réussie!', 'success');
      setShowPostLoginLoading(true)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 5000)
    } catch (error: any) {
      showToast(error?.data?.message || 'Email ou mot de passe incorrect', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-gradient-animated">
      <PostLoginLoadingOverlay isOpen={showPostLoginLoading} />
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-lavender-200 animate-card-enter">
        <div className="flex flex-col items-center justify-center gap-4 mb-8">
          <img 
            src={depotLogo} 
            alt="BÉBÉ-DÉPÔT Logo" 
            className="w-32 h-32 object-contain"
          />
          <div className="text-center">
            <h1 className="text-3xl font-bold text-lavender-800">BÉBÉ-DÉPÔT</h1>
            <p className="text-sm text-lavender-600 mt-1">Back Office</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-lavender-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-lavender-500 transition-colors"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-lavender-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-lavender-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-lavender-700 text-white rounded-lg hover:bg-lavender-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
