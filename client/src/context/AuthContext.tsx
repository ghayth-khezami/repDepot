import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  showWelcomeOverlay: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));

      // Show welcome overlay once per browser tab/session when user is already logged in
      const alreadyShown = sessionStorage.getItem('welcome_overlay_shown') === 'true';
      if (!alreadyShown) {
        setShowWelcomeOverlay(true);
        sessionStorage.setItem('welcome_overlay_shown', 'true');
        window.setTimeout(() => setShowWelcomeOverlay(false), 1000);
      }
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    // Show welcome overlay after an explicit login
    setShowWelcomeOverlay(true);
    sessionStorage.setItem('welcome_overlay_shown', 'true');
    window.setTimeout(() => setShowWelcomeOverlay(false), 5000);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setShowWelcomeOverlay(false);
    sessionStorage.removeItem('welcome_overlay_shown');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        showWelcomeOverlay,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
