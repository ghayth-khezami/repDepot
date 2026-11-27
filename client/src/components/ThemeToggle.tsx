import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/cn';

/** Light / dark switch, next to the bell (top-right on every screen). */
export default function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={cn(
        'bd-focus flex h-11 w-11 items-center justify-center rounded-2xl border border-bd-line/10 bg-bd-surface text-bd-violet shadow-card transition active:scale-95 hover:text-bd-pink-strong',
        className,
      )}
    >
      {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  );
}
