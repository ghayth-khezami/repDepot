import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WelcomeSplash } from './WelcomeSplash';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, bootstrapping, splashActive } = useAuth();

  if (bootstrapping) {
    return <WelcomeSplash />;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      {splashActive ? <WelcomeSplash /> : null}
      {children}
    </>
  );
}
