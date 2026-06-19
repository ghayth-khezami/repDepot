import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ScanLine, ShoppingBag, User, Menu } from 'lucide-react';
import { useState } from 'react';
import { Drawer } from './Drawer';
import { APP_NAME, LOGO_URL } from '../lib/brand';

const tabs = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Produits', icon: Package },
  { to: '/scan', label: 'Scanner', icon: ScanLine },
  { to: '/commands', label: 'Commandes', icon: ShoppingBag },
  { to: '/profile', label: 'Profil', icon: User },
];

export function MobileLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const hideNav = location.pathname === '/scan';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-lavender-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="app-header sticky top-0 z-40 px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex flex-col items-center">
            <img src={LOGO_URL} alt="" className="h-10 w-10 object-contain" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">{APP_NAME}</p>
          </div>
          <div className="w-11" />
        </div>
      </header>

      <main className={`relative z-10 -mt-4 flex-1 overflow-y-auto rounded-t-[2rem] bg-lavender-50/95 dark:bg-slate-950 ${hideNav ? '' : 'pb-24'}`}>
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="nav-bar fixed bottom-0 left-0 right-0 z-50 mx-3 mb-[max(0.5rem,env(safe-area-inset-bottom))] rounded-[1.75rem] border border-white/60 bg-white/95 shadow-xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-stretch justify-around px-1 py-1">
            {tabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-0.5 rounded-[1.25rem] py-2 text-[10px] font-semibold transition-all duration-300 ${
                    isActive ? 'text-primary-600' : 'text-gray-400'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                        isActive ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30' : ''
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
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
