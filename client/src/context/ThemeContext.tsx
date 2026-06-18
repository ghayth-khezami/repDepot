import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const STORAGE_KEY = 'depot-backoffice-theme';
const THEME_VERSION_KEY = 'depot-backoffice-theme-v';
const THEME_VERSION = '2';

/** Backoffice defaults to light (white). Dark only if user explicitly toggled it on. */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  if (localStorage.getItem(THEME_VERSION_KEY) !== THEME_VERSION) {
    localStorage.setItem(STORAGE_KEY, 'light');
    localStorage.setItem(THEME_VERSION_KEY, THEME_VERSION);
    return 'light';
  }
  return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
