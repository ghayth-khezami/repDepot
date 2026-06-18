import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  FileText,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Clock,
  MessageSquare,
  Award,
  Mail,
  Heart,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import depotLogo from '../depot.jpg';

const Sidebar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    { path: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
    { path: '/products', label: 'Produits', icon: Package },
    { path: '/coups-de-coeur', label: 'Coups de cœur', icon: Heart },
    { path: '/categories', label: 'Catégories', icon: FolderTree },
    { path: '/marques', label: 'Marques', icon: Award },
    { path: '/clients', label: 'Clients', icon: ShoppingCart },
    { path: '/co-clients', label: 'Déposants', icon: ShoppingCart },
    { path: '/commands', label: 'Commandes', icon: ShoppingCart },
    { path: '/deposit-requests', label: 'Demandes de depot', icon: FileText },
    { path: '/horaires', label: 'Horaires', icon: Clock },
    { path: '/avis-clients', label: 'Avis clients', icon: MessageSquare },
    { path: '/newsletter', label: 'Newsletter', icon: Mail },
    { path: '/users', label: 'Utilisateurs', icon: FileText },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-primary-600 p-2 text-white shadow-lg md:hidden"
        aria-label="Menu"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed z-40 flex h-screen w-64 flex-col bg-gradient-to-b from-purple-100 via-purple-50 to-yellow-50 text-gray-800 shadow-lg transition-transform duration-300 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:text-gray-100 md:static md:translate-x-0`}
      >
        <div className="border-b border-gray-200 p-6 dark:border-slate-700">
          <div className="flex flex-col items-center gap-3">
            <img src={depotLogo} alt="BÉBÉ-DÉPÔT Logo" className="h-20 w-20 object-contain" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-purple-800 dark:text-purple-200">BÉBÉ-DÉPÔT</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">Back Office</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                  active
                    ? 'bg-purple-200 font-semibold text-purple-900 shadow-sm dark:bg-purple-900/50 dark:text-purple-100'
                    : 'text-gray-700 hover:bg-purple-100 hover:text-purple-900 dark:text-gray-300 dark:hover:bg-slate-700 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-gray-200 p-4 dark:border-slate-700">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-purple-100 hover:text-purple-900 dark:text-gray-200 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-pressed={isDark}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-purple-100 hover:text-purple-900 dark:text-gray-200 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      ) : null}
    </>
  );
};

export default Sidebar;
