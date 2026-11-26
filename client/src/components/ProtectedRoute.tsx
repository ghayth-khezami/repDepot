import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PinLockScreen from './PinLockScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, bootstrapping, locked } = useAuth();

  if (bootstrapping) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (locked) return <PinLockScreen />;

  return <>{children}</>;
};

export default ProtectedRoute;
