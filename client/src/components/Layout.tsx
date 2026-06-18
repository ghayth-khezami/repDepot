import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { PostLoginLoadingOverlay } from './PostLoginLoadingOverlay';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { showWelcomeOverlay } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <PostLoginLoadingOverlay isOpen={showWelcomeOverlay} />
        <div className="bo-page flex-1 overflow-y-auto pt-16 md:pt-0">
          <div className="p-4 md:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
