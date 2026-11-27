import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  Clock,
  MessageSquare,
  Mail,
  ShieldCheck,
  QrCode,
  Users,
  UserRound,
  Settings2,
  MoreHorizontal,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
import { Illustration } from './ui';
import InstallAppButton from './InstallAppButton';
import depotLogo from '../depot.jpg';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

/** Always visible. */
export const mainItems: NavItem[] = [
  { path: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
  { path: '/depots/nouveau', label: 'Déposants', icon: Users },
  { path: '/products', label: 'Produits', icon: Package },
  { path: '/clients', label: 'Clients', icon: UserRound },
  { path: '/commands', label: 'Commandes', icon: ShoppingCart },
  { path: '/categories', label: 'Catégories', icon: FolderTree },
];

/** "Plus" accordion. Coups de cœur = the ♥ on each product (no separate page in the menu). */
export const moreItems: NavItem[] = [
  { path: '/scan', label: 'Scanner QR', icon: QrCode },
  { path: '/youtube', label: 'Boutique & YouTube', icon: Settings2 },
  { path: '/horaires', label: 'Horaires', icon: Clock },
  { path: '/avis-clients', label: 'Avis clients', icon: MessageSquare },
  { path: '/newsletter', label: 'Newsletter', icon: Mail },
  { path: '/users', label: 'Utilisateurs', icon: ShieldCheck },
];

export const menuItems: NavItem[] = [...mainItems, ...moreItems];

/** Already in the mobile bottom bar → hidden from the mobile drawer (still shown on desktop). */
const IN_BOTTOM_BAR = new Set(['/', '/depots/nouveau', '/scan', '/products', '/commands']);

export function isNavActive(pathname: string, path: string) {
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'bd-focus flex min-h-[44px] items-center gap-3 rounded-full px-4 text-[15px] font-bold transition duration-200',
        IN_BOTTOM_BAR.has(item.path) && 'max-md:hidden',
        active ? 'bg-grad-pink-strong text-white shadow-glow-pink' : 'text-bd-ink hover:bg-bd-lilac/60',
      )}
    >
      <Icon className={cn('h-6 w-6 shrink-0', active ? 'text-white' : 'text-bd-violet')} strokeWidth={2} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

const Sidebar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const inMore = moreItems.some((i) => isNavActive(location.pathname, i.path));
  const [moreOpen, setMoreOpen] = useState(inMore);
  useEffect(() => {
    if (inMore) setMoreOpen(true);
  }, [inMore]);

  useEffect(() => setIsMobileMenuOpen(false), [location.pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileMenuOpen((v) => !v)}
        className="bd-focus fixed left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-grad-violet-strong text-white shadow-glow-violet md:hidden"
        aria-label={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isMobileMenuOpen}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={cn(
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          'fixed z-40 flex h-[100dvh] w-[264px] flex-col border-r border-bd-line/10 bg-bd-surface/90 shadow-card backdrop-blur-xl transition-transform duration-300 md:static md:translate-x-0 md:bg-bd-surface/70',
        )}
      >
        <div className="relative mx-3 mt-3 overflow-hidden rounded-b-[28px] rounded-t-3xl bg-grad-brand px-5 pb-5 pt-6 text-center text-white shadow-glow-violet">
          <div aria-hidden className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-12 -right-6 h-32 w-32 rounded-full bg-white/10" />
          <img src={depotLogo} alt="" className="relative mx-auto h-16 w-16 rounded-2xl bg-white/90 object-contain p-1 shadow-lg" />
          <p className="relative mt-3 text-lg font-black tracking-wide">BÉBÉ-DÉPÔT</p>
          <p className="relative text-xs font-bold text-white/85">Back Office</p>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {mainItems.map((item) => (
            <NavLink key={item.path} item={item} active={isNavActive(location.pathname, item.path)} />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="bd-focus mt-2 flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 text-[13px] font-black uppercase tracking-[0.12em] text-bd-muted transition hover:bg-bd-lilac/60"
          >
            <MoreHorizontal className="h-5 w-5 text-bd-violet" />
            <span className="flex-1 text-left">Plus</span>
            <ChevronDown className={cn('h-4 w-4 transition', moreOpen && 'rotate-180')} />
          </button>
          {moreOpen ? (
            <div className="bd-anim-fade-up space-y-1">
              {moreItems.map((item) => (
                <NavLink key={item.path} item={item} active={isNavActive(location.pathname, item.path)} />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="relative space-y-1 border-t border-bd-line/10 p-3">
          <Illustration name="teddy" className="pointer-events-none absolute -top-14 right-3 h-14 w-14 opacity-90" />
          <InstallAppButton />
          <button
            type="button"
            onClick={logout}
            className="bd-focus flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 font-bold text-bd-ink transition hover:bg-bd-lilac/60"
          >
            <LogOut className="h-5 w-5 text-bd-violet" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-30 bg-bd-ink/40 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)} aria-hidden />
      ) : null}
    </>
  );
};

export default Sidebar;
