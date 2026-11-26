import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './store/api/featuredProductApi';
import './store/api/siteSettingsApi';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const CoClientsPage = lazy(() => import('./pages/CoClientsPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const CommandsPage = lazy(() => import('./pages/CommandsPage'));
const DepositRequestsPage = lazy(() => import('./pages/DepositRequestsPage'));
const HorairesPage = lazy(() => import('./pages/HorairesPage'));
const ClientFeedbacksPage = lazy(() => import('./pages/ClientFeedbacksPage'));
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'));
const FeaturedProductsPage = lazy(() => import('./pages/FeaturedProductsPage'));
const SiteSettingsPage = lazy(() => import('./pages/SiteSettingsPage'));
const QrScannerPage = lazy(() => import('./pages/QrScannerPage'));
const NouveauDepotPage = lazy(() => import('./pages/NouveauDepotPage'));
const DepotContractPage = lazy(() => import('./pages/DepotContractPage'));

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
              <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-card bg-bd-lilac/50" aria-busy="true" aria-label="Chargement" />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/co-clients" element={<CoClientsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/scan" element={<QrScannerPage />} />
                <Route path="/coups-de-coeur" element={<FeaturedProductsPage />} />
                <Route path="/commands" element={<CommandsPage />} />
                <Route path="/deposit-requests" element={<DepositRequestsPage />} />
                <Route path="/depots/nouveau" element={<NouveauDepotPage />} />
                <Route path="/depots/:id" element={<DepotContractPage />} />
                <Route path="/depots/:id/articles" element={<DepotContractPage mode="add" />} />
                <Route path="/horaires" element={<HorairesPage />} />
                <Route path="/avis-clients" element={<ClientFeedbacksPage />} />
                <Route path="/youtube" element={<SiteSettingsPage />} />
                <Route path="/newsletter" element={<NewsletterPage />} />
              </Routes>
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
