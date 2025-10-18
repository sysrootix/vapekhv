import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useTelegramApp } from './hooks/useTelegramApp';
import { useAuthStore } from './store/authStore';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import BonusPage from './pages/BonusPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import LoadingScreen from './components/LoadingScreen';
import BottomNav from './components/BottomNav';

function App() {
  const { isInitialized } = useTelegramApp();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Expand app to full height
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
      window.Telegram.WebApp.ready();
    }
  }, []);

  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <BrowserRouter>
        <AppContent isAuthenticated={isAuthenticated} />
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            border: 'none',
          },
        }}
      />
    </>
  );
}

function AppContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const showBottomNav = isAuthenticated && location.pathname !== '/auth' && !location.pathname.startsWith('/product/') && location.pathname !== '/checkout';

  // Прокрутка вверх при переходе между страницами
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <>
      <Routes>
        <Route
          path="/auth"
          element={!isAuthenticated ? <AuthPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/catalog"
          element={isAuthenticated ? <CatalogPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/product/:id"
          element={isAuthenticated ? <ProductDetailPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/cart"
          element={isAuthenticated ? <CartPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/checkout"
          element={isAuthenticated ? <CheckoutPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <ProfilePage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/bonus"
          element={isAuthenticated ? <BonusPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/orders"
          element={isAuthenticated ? <OrdersPage /> : <Navigate to="/auth" replace />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} replace />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </>
  );
}

export default App;

