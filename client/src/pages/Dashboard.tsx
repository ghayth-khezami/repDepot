import { useState, useEffect } from 'react';
import {
  useGetRevenueBreakdownQuery,
  useGetMonthlySoldProductsQuery,
  useGetDepotVsBuyingQuery,
  useGetCommandLocationsQuery,
  useGetTotalSurchargeQuery,
  useGetTopProductsQuery,
} from '../store/api/statsApi';
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  MapPin,
  Receipt,
  Award,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const Dashboard = () => {
  const { data: revenueData, isLoading: revenueLoading } = useGetRevenueBreakdownQuery({ period: 'all' });
  const { data: monthlySoldData, isLoading: monthlyLoading } = useGetMonthlySoldProductsQuery({ period: 'all' });
  const { data: depotVsBuyingData, isLoading: depotLoading } = useGetDepotVsBuyingQuery({ period: 'all' });
  const { data: locationsData, isLoading: locationsLoading } = useGetCommandLocationsQuery({ period: 'all' });
  const { data: surchargeData, isLoading: surchargeLoading } = useGetTotalSurchargeQuery({ period: 'all' });
  const { data: topProductsData, isLoading: topProductsLoading } = useGetTopProductsQuery({ period: 'all', limit: 5 });

  const [animatedValues, setAnimatedValues] = useState({
    totalRevenue: 0,
    buyingRevenue: 0,
    depotRevenue: 0,
    totalSurcharge: 0,
  });

  // Animate numbers
  useEffect(() => {
    if (revenueData) {
      const duration = 1500;
      const steps = 60;
      const stepDuration = duration / steps;
      
      const animate = (start: number, end: number, setter: (val: number) => void) => {
        let currentStep = 0;
        const increment = (end - start) / steps;
        
        const interval = setInterval(() => {
          currentStep++;
          const value = start + increment * currentStep;
          setter(value);
          
          if (currentStep >= steps) {
            setter(end);
            clearInterval(interval);
          }
        }, stepDuration);
      };

      animate(0, revenueData.totalRevenue, (val) => {
        setAnimatedValues((prev) => ({ ...prev, totalRevenue: val }));
      });
      animate(0, revenueData.buyingRevenue, (val) => {
        setAnimatedValues((prev) => ({ ...prev, buyingRevenue: val }));
      });
      animate(0, revenueData.depotRevenue, (val) => {
        setAnimatedValues((prev) => ({ ...prev, depotRevenue: val }));
      });
    }
  }, [revenueData]);

  // Animate surcharge
  useEffect(() => {
    if (surchargeData) {
      const duration = 1500;
      const steps = 60;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      const increment = surchargeData.totalSurcharge / steps;
      
      const interval = setInterval(() => {
        currentStep++;
        const value = increment * currentStep;
        setAnimatedValues((prev) => ({ ...prev, totalSurcharge: value }));
        
        if (currentStep >= steps) {
          setAnimatedValues((prev) => ({ ...prev, totalSurcharge: surchargeData.totalSurcharge }));
          clearInterval(interval);
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }
  }, [surchargeData]);

  // Format month names
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return monthNames[parseInt(month) - 1];
  };

  // Get max count for bar chart scaling
  const maxCount = monthlySoldData
    ? Math.max(...monthlySoldData.map((item) => item.count), 1)
    : 1;

  // Geocode addresses (simplified - in production, use a geocoding service)
  const getCoordinates = (address: string) => {
    // Tunisia center coordinates as fallback
    // In production, use a geocoding API
    return [34.0, 9.0]; // Approximate Tunisia center
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Tableau de Bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre activité</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <DollarSign className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Revenu Total</h3>
            <p className="text-3xl font-bold">
              {revenueLoading ? '...' : `${animatedValues.totalRevenue.toFixed(2)} TND`}
            </p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs opacity-75">Tous les revenus combinés</p>
            </div>
          </div>

          {/* Buying Revenue Card */}
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Revenu d'Achat</h3>
            <p className="text-3xl font-bold">
              {revenueLoading ? '...' : `${animatedValues.buyingRevenue.toFixed(2)} TND`}
            </p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs opacity-75">Revenus des produits achetés</p>
            </div>
          </div>

          {/* Depot Revenue Card */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <Package className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Revenu de Dépôt</h3>
            <p className="text-3xl font-bold">
              {revenueLoading ? '...' : `${animatedValues.depotRevenue.toFixed(2)} TND`}
            </p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs opacity-75">Revenus des produits en dépôt</p>
            </div>
          </div>

          {/* Total Surcharge Card */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 rounded-lg p-3">
                <Receipt className="w-8 h-8" />
              </div>
              <TrendingUp className="w-6 h-6 opacity-80" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Surcharge Totale</h3>
            <p className="text-3xl font-bold">
              {surchargeLoading ? '...' : `${animatedValues.totalSurcharge.toFixed(2)} TND`}
            </p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-xs opacity-75">Total des surcharges</p>
            </div>
          </div>
        </div>

        {/* Top 5 Products Section */}
        {topProductsData && topProductsData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 transform hover:shadow-xl transition-all duration-300 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-600" />
              Top 5 Produits les Plus Vendus
            </h2>
            {topProductsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {topProductsData.map((product, index) => (
                  <div
                    key={product.productId}
                    className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden animate-card-enter"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Ranking Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-gradient-to-br from-purple-400 to-purple-600'
                      }`}>
                        {product.rank || index + 1}
                      </div>
                    </div>

                    {/* Product Photo */}
                    <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden relative">
                      {product.photo ? (
                        <img
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${
                            product.photo.startsWith('/') ? product.photo : '/' + product.photo
                          }`}
                          alt={product.productName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-16 h-16" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                        {product.productName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">{product.categoryName}</p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-500">Valeur Totale</p>
                          <p className="text-lg font-bold text-purple-600">
                            {product.totalValue?.toFixed(2) || product.PrixVente?.toFixed(2) || '0.00'} TND
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Vendu</p>
                          <p className="text-sm font-semibold text-gray-700">{product.count}x</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart - Monthly Sold Products */}
          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:shadow-xl transition-all duration-300 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              Produits Vendus par Mois
            </h2>
            {monthlyLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : monthlySoldData && monthlySoldData.length > 0 ? (
              <div className="space-y-4">
                {monthlySoldData.map((item, index) => {
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.month} className="animate-slide-right" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm font-medium text-gray-700 w-12">{formatMonth(item.month)}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                          >
                            {item.count > 0 && (
                              <span className="text-white text-xs font-semibold">{item.count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>

          {/* Pie Chart - Depot vs Buying */}
          <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:shadow-xl transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-6 h-6 text-pink-600" />
              Produits Dépôt vs Achat
            </h2>
            {depotLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
              </div>
            ) : depotVsBuyingData ? (
              <div className="flex flex-col items-center justify-center">
                {/* SVG Pie Chart */}
                <svg width="300" height="300" viewBox="0 0 300 300" className="mb-6">
                  <circle
                    cx="150"
                    cy="150"
                    r="100"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="40"
                  />
                  {depotVsBuyingData.total > 0 && (
                    <>
                      <circle
                        cx="150"
                        cy="150"
                        r="100"
                        fill="none"
                        stroke="#ec4899"
                        strokeWidth="40"
                        strokeDasharray={`${(depotVsBuyingData.depot / depotVsBuyingData.total) * 628.32} 628.32`}
                        strokeDashoffset="0"
                        transform="rotate(-90 150 150)"
                        className="animate-draw-circle"
                      />
                      <circle
                        cx="150"
                        cy="150"
                        r="100"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="40"
                        strokeDasharray={`${(depotVsBuyingData.buying / depotVsBuyingData.total) * 628.32} 628.32`}
                        strokeDashoffset={`-${(depotVsBuyingData.depot / depotVsBuyingData.total) * 628.32}`}
                        transform="rotate(-90 150 150)"
                        className="animate-draw-circle"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </>
                  )}
                </svg>
                
                {/* Legend */}
                <div className="space-y-4 w-full">
                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                      <span className="font-medium text-gray-900">En Dépôt</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {depotVsBuyingData.depot} ({depotVsBuyingData.total > 0 ? ((depotVsBuyingData.depot / depotVsBuyingData.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="font-medium text-gray-900">Achat</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {depotVsBuyingData.buying} ({depotVsBuyingData.total > 0 ? ((depotVsBuyingData.buying / depotVsBuyingData.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-lg p-6 transform hover:shadow-xl transition-all duration-300 animate-fade-in mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-green-600" />
            Localisation des Commandes en Tunisie
          </h2>
          {locationsLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
          ) : locationsData && locationsData.length > 0 ? (
            <div className="h-96 rounded-lg overflow-hidden">
              <MapContainer
                center={[34.0, 9.0]}
                zoom={6}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {locationsData.map((location, index) => {
                  const [lat, lng] = getCoordinates(location.address);
                  return (
                    <Marker key={location.id} position={[lat + (Math.random() - 0.5) * 0.5, lng + (Math.random() - 0.5) * 0.5]}>
                      <Popup>
                        <div className="p-2 space-y-1">
                          <p className="font-semibold text-sm">{location.client}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(location.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-xs text-purple-600 font-medium">{location.revenue.toFixed(2)} TND</p>
                          <p className="text-xs text-gray-600">{location.address}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune commande avec adresse disponible</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-right {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes draw-circle {
          from {
            stroke-dasharray: 0 628.32;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-right {
          animation: slide-right 0.5s ease-out forwards;
          opacity: 0;
        }

        .animate-draw-circle {
          animation: draw-circle 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
