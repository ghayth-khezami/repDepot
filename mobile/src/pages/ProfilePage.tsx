import { Download, LogOut, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/ui';
import { getApiOrigin } from '../lib/apiBase';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone);

  return (
    <div className="pb-6">
      <PageHeader title="Profil" subtitle="Compte administrateur" />

      <div className="mx-4 rounded-2xl border border-primary-100 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 dark:bg-primary-900/40">
            <User size={28} />
          </div>
          <div>
            <p className="font-bold">{user?.username || user?.email}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-primary-600">Administrateur</p>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-4 space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-2xl border border-primary-100 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          <span className="font-medium">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
        </button>

        {!isStandalone ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex gap-3">
              <Download className="shrink-0 text-amber-700" size={22} />
              <div className="text-sm">
                <p className="font-bold text-amber-900 dark:text-amber-100">Installer l'application</p>
                <p className="mt-1 text-amber-800 dark:text-amber-200">
                  <strong>iPhone:</strong> Safari → Partager → « Sur l'écran d'accueil »
                </p>
                <p className="mt-1 text-amber-800 dark:text-amber-200">
                  <strong>Android:</strong> Chrome → menu ⋮ → « Installer l'application »
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            ✓ Application installée en mode standalone
          </p>
        )}


        <p className="px-1 text-xs text-gray-400">API: {getApiOrigin()}</p>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 py-4 font-semibold text-red-600 dark:border-red-900"
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
