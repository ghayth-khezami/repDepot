import { ReactNode } from 'react';
import Sidebar, { isNavActive } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { PostLoginLoadingOverlay } from './PostLoginLoadingOverlay';
import { AutoFieldMic } from './Dictation';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, PackagePlus, ScanLine, ShoppingCart } from 'lucide-react';
import { cn } from '../lib/cn';
import { Blobs } from './ui';

interface LayoutProps {
  children: ReactNode;
}

const mobileNav = [
  { path: '/', label: 'Accueil', icon: Home },
  { path: '/depots/nouveau', label: 'Dépôt', icon: PackagePlus },
  { path: '/scan', label: 'Scanner', icon: ScanLine, raised: true },
  { path: '/products', label: 'Produits', icon: Package },
  { path: '/commands', label: 'Commandes', icon: ShoppingCart },
] as const;

/** Mobile bottom navigation (≤ 768px): Accueil, Dépôt, raised centre "Scanner", Produits, Commandes. */
function MobileTabBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 items-end rounded-[28px] border border-bd-line/10 bg-bd-surface/90 px-1.5 pb-1.5 pt-1 shadow-[0_12px_40px_rgba(76,29,149,0.18)] backdrop-blur-xl md:hidden"
    >
      {mobileNav.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(pathname, item.path);
        if ('raised' in item && item.raised) {
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={active ? 'page' : undefined}
              className="bd-focus -mt-7 flex flex-col items-center gap-1 rounded-2xl text-[11px] font-extrabold text-bd-ink"
            >
              <span
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full bg-grad-pink-strong text-white shadow-glow-pink ring-4 ring-bd-surface transition active:scale-95',
                  active && 'scale-105',
                )}
              >
                <Icon size={26} strokeWidth={2.2} aria-hidden />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'bd-focus flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-extrabold transition',
              active ? 'bg-bd-blush text-bd-pink-strong' : 'text-bd-muted',
            )}
          >
            <Icon size={22} strokeWidth={2} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const Layout = ({ children }: LayoutProps) => {
  const { showWelcomeOverlay } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="relative isolate flex h-[100dvh] bg-bd-bg">
      <Blobs />
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <PostLoginLoadingOverlay isOpen={showWelcomeOverlay} />
        <div className="bo-page flex-1 overflow-y-auto pt-16 md:pt-0">
          <div key={pathname} className="bd-anim-page p-4 pb-32 md:p-8 md:pb-8">{children}</div>
        </div>
        <AutoFieldMic />
        <MobileTabBar />
      </main>
    </div>
  );
};

export default Layout;
