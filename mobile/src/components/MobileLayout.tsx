import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, ScanLine, ShoppingBag, User, Menu, Bell } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from './Drawer';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '../context/NotificationContext';

const tabs = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/scan', label: 'Scanner', icon: ScanLine },
  { to: '/commands', label: 'Commandes', icon: ShoppingBag },
  { to: '/profile', label: 'Profil', icon: User },
];

export function MobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { openPanel, unreadCount } = useNotifications();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-lavender-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-primary-100 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300"
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">BÉBÉ-DÉPÔT</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">Admin mobile</p>
        </div>
        <button
          type="button"
          onClick={openPanel}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-slate-800 dark:text-primary-300"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary-100 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
                  isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                      isActive ? 'bg-primary-600 text-white shadow-md' : ''
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <NotificationPanel />
    </div>
  );
}
