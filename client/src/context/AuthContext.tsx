import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  isAdmin: boolean;
  showWelcomeOverlay: boolean;
  bootstrapping: boolean;
  /** Saved session reopened in a new app/tab session: quick PIN required. */
  locked: boolean;
  unlock: (code: string) => boolean;
}

/** Quick-unlock code asked when the app is reopened (the session itself stays logged in). */
const QUICK_PIN = '1801';
const UNLOCK_KEY = 'bd-unlocked';

function readUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}
function markUnlocked() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    /* ignore */
  }
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
  const [bootstrapping, setBootstrapping] = useState(true);
  const [locked, setLocked] = useState(() => !!localStorage.getItem('token') && !readUnlocked());
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

        const alreadyShown = sessionStorage.getItem('welcome_overlay_shown') === 'true';
        if (!alreadyShown) {
          setShowWelcomeOverlay(true);
          sessionStorage.setItem('welcome_overlay_shown', 'true');
          window.setTimeout(() => setShowWelcomeOverlay(false), 1000);
        }
      })
      .catch((err: { status?: number | string }) => {
        if (cancelled) return;
        // Stay signed in through network errors / server restarts; only a rejected token logs out.
        if (err?.status === 401 || err?.status === 403) {
          clearSession();
          return;
        }
        try {
          const stored = JSON.parse(localStorage.getItem('user') || 'null') as User | null;
          if (stored?.role === 'ADMIN') setUser(stored);
          else clearSession();
        } catch {
          clearSession();
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
    // Bootstrap session once on mount — do not depend on fetchMe (unstable RTK reference)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = (code: string) => {
    if (code !== QUICK_PIN) return false;
    markUnlocked();
    window.setTimeout(() => setLocked(false), 450);
    return true;
  };

  const login = (newToken: string, newUser: User) => {
    markUnlocked();
    setLocked(false);
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
    clearSession();
    setLocked(false);
    setShowWelcomeOverlay(false);
    sessionStorage.removeItem('welcome_overlay_shown');
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
        isAdmin: user?.role === 'ADMIN',
        showWelcomeOverlay,
        bootstrapping,
        locked,
        unlock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
