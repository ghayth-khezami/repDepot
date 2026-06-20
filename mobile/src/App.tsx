import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MobileLayout } from './components/MobileLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ScanPage from './pages/ScanPage';
import CommandsPage from './pages/CommandsPage';
import ProfilePage from './pages/ProfilePage';
import CategoriesPage from './pages/CategoriesPage';
import ClientsPage from './pages/ClientsPage';
import CoClientsPage from './pages/CoClientsPage';
import DepositRequestsPage from './pages/DepositRequestsPage';
import FeaturedProductsPage from './pages/FeaturedProductsPage';
import HorairesPage from './pages/HorairesPage';
import ClientFeedbacksPage from './pages/ClientFeedbacksPage';
import NewsletterPage from './pages/NewsletterPage';
import UsersPage from './pages/UsersPage';

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MobileLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="scan" element={<ScanPage />} />
        <Route path="commands" element={<CommandsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="co-clients" element={<CoClientsPage />} />
        <Route path="deposit-requests" element={<DepositRequestsPage />} />
        <Route path="coups-de-coeur" element={<FeaturedProductsPage />} />
        <Route path="horaires" element={<HorairesPage />} />
        <Route path="avis-clients" element={<ClientFeedbacksPage />} />
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
