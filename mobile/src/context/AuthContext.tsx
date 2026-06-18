import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLazyGetMeQuery } from '../store/api/authApi';

interface User {
  id: string;
  email: string;
  username?: string;
  role?: 'CLIENT' | 'DEPOSER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  bootstrapping: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const navigate = useNavigate();
  const [fetchMe] = useLazyGetMeQuery();

  const clearSession = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setBootstrapping(false);
      return;
    }
    setToken(storedToken);
    let cancelled = false;
    fetchMe()
      .unwrap()
      .then((res) => {
        if (cancelled) return;
        if (res.user.role !== 'ADMIN') {
          clearSession();
          return;
        }
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
      })
      .catch(() => {
        if (!cancelled) clearSession();
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        bootstrapping,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
