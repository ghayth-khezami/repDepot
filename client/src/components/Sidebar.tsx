import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, ShoppingCart, FileText, LogOut, Eye, Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import depotLogo from '../depot.jpg';

const Sidebar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  const menuItems = [
    { path: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
    { path: '/products', label: 'Produits', icon: Package },
    { path: '/categories', label: 'Catégories', icon: FolderTree },
    { path: '/clients', label: 'Clients', icon: ShoppingCart },
    { path: '/co-clients', label: 'Co-Clients', icon: ShoppingCart },
    { path: '/commands', label: 'Commandes', icon: ShoppingCart },
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
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-lavender-600 text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static w-64 bg-gradient-to-b from-purple-100 via-purple-50 to-yellow-50 text-gray-800 flex flex-col h-screen transition-transform duration-300 z-40 shadow-lg`}
      >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col items-center gap-3">
          <img 
            src={depotLogo} 
            alt="BÉBÉ-DÉPÔT Logo" 
            className="w-20 h-20 object-contain"
          />
          <div className="text-center">
            <h1 className="font-bold text-lg text-purple-800">BÉBÉ-DÉPÔT</h1>
            <p className="text-xs text-gray-600">Back Office</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-purple-200 text-purple-900 font-semibold shadow-sm'
                  : 'text-gray-700 hover:bg-purple-100 hover:text-purple-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-purple-100 hover:text-purple-900 transition-colors">
          <Moon className="w-5 h-5" />
          <span>Mode Sombre</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-purple-100 hover:text-purple-900 transition-colors">
          <Eye className="w-5 h-5" />
          <span>Voir la Vitrine</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-purple-100 hover:text-purple-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>

    {/* Mobile overlay */}
    {isMobileMenuOpen && (
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-30"
        onClick={() => setIsMobileMenuOpen(false)}
      />
    )}
    </>
  );
};

export default Sidebar;
