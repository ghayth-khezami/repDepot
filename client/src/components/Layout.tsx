import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { PostLoginLoadingOverlay } from './PostLoginLoadingOverlay';
import VoiceAssistant from './VoiceAssistant';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, QrCode, ShoppingCart } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { showWelcomeOverlay } = useAuth();
  const location = useLocation();
  const mobileNav = [
    ['/', 'Dashboard', LayoutDashboard],
    ['/products', 'Produits', Package],
    ['/scan', 'Scanner', QrCode],
    ['/commands', 'Commandes', ShoppingCart],
  ] as const;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <PostLoginLoadingOverlay isOpen={showWelcomeOverlay} />
        <div className="bo-page flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="p-4 md:p-8">{children}</div>
        </div>
        <VoiceAssistant />
        <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-3xl border border-white/50 bg-white/75 p-2 shadow-2xl backdrop-blur-xl md:hidden">
          {mobileNav.map(([path, label, Icon]) => <Link key={path} to={path} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold ${location.pathname === path ? 'bg-primary-100 text-primary-700' : 'text-gray-500'}`}><Icon size={18} /><span>{label}</span></Link>)}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
