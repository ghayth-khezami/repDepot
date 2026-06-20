import { Link, useLocation } from 'react-router-dom';
import {
  Heart,
  FolderTree,
  Users,
  FileText,
  Clock,
  MessageSquare,
  Mail,
  X,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/coups-de-coeur', label: 'Coups de cœur', icon: Heart },
  { to: '/categories', label: 'Catégories', icon: FolderTree },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/co-clients', label: 'Déposants', icon: Users },
  { to: '/deposit-requests', label: 'Demandes dépôt', icon: FileText },
  { to: '/horaires', label: 'Horaires', icon: Clock },
  { to: '/avis-clients', label: 'Avis clients', icon: MessageSquare },
  { to: '/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/users', label: 'Utilisateurs', icon: FileText },
];

export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />
      <aside className="fixed left-0 top-0 z-[70] flex h-full w-[min(18rem,85vw)] flex-col bg-gradient-to-b from-purple-100 via-white to-lavender-50 shadow-2xl dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
        <div className="flex items-center justify-between border-b border-primary-100 p-4 dark:border-slate-700">
          <div>
            <p className="font-bold text-primary-800 dark:text-primary-200">BÉBÉ-DÉPÔT</p>
            <p className="text-xs text-gray-500">Menu admin</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-primary-50 dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  active
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-primary-100 p-3 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 hover:bg-primary-50 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Mode clair' : 'Mode sombre'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
