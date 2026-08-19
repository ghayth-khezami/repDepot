import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './store/api/featuredProductApi';
import './store/api/heroCarouselApi';
import './store/api/siteSettingsApi';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import ClientsPage from './pages/ClientsPage';
import CoClientsPage from './pages/CoClientsPage';
import CategoriesPage from './pages/CategoriesPage';
import ProductsPage from './pages/ProductsPage';
import CommandsPage from './pages/CommandsPage';
import DepositRequestsPage from './pages/DepositRequestsPage';
import HorairesPage from './pages/HorairesPage';
import ClientFeedbacksPage from './pages/ClientFeedbacksPage';
import MarksPage from './pages/MarksPage';
import NewsletterPage from './pages/NewsletterPage';
import FeaturedProductsPage from './pages/FeaturedProductsPage';
import HeroCarouselPage from './pages/HeroCarouselPage';
import SiteSettingsPage from './pages/SiteSettingsPage';

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, bootstrapping } = useAuth();
  if (bootstrapping) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/co-clients" element={<CoClientsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/coups-de-coeur" element={<FeaturedProductsPage />} />
                <Route path="/commands" element={<CommandsPage />} />
                <Route path="/deposit-requests" element={<DepositRequestsPage />} />
                <Route path="/horaires" element={<HorairesPage />} />
                <Route path="/avis-clients" element={<ClientFeedbacksPage />} />
                <Route path="/marques" element={<MarksPage />} />
                <Route path="/carrousel" element={<HeroCarouselPage />} />
                <Route path="/youtube" element={<SiteSettingsPage />} />
                <Route path="/newsletter" element={<NewsletterPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
