import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext'
import { PostLoginLoadingOverlay } from './PostLoginLoadingOverlay'

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { showWelcomeOverlay } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:ml-0">
        <PostLoginLoadingOverlay isOpen={showWelcomeOverlay} />
        <div className="pt-16 md:pt-8 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
