import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegramApp } from './hooks/useTelegramApp';
import { useAuthStore } from './store/authStore';
import { useVPNDetection, markVPNNotificationShown } from './hooks/useVPNDetection';
import { reviewApi } from './api/review';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ProfilePage from './pages/ProfilePage';
import BonusPage from './pages/BonusPage';
import OrdersPage from './pages/OrdersPage';
import PaymentPage from './pages/PaymentPage';
import ProductDetailPage from './pages/ProductDetailPage';
import AdminPage from './pages/AdminPage';
import CrmPage from './pages/CrmPage';
import FAQPage from './pages/FAQPage';
import AllReviewsPage from './pages/AllReviewsPage';
import LoadingScreen from './components/LoadingScreen';
import BottomNav from './components/BottomNav';
import VPNNotification from './components/VPNNotification';
import ReviewNotification from './components/ReviewNotification';
import CreateReviewModal from './components/CreateReviewModal';
import ReferralPage from './pages/ReferralPage';
import toast from 'react-hot-toast';

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isVPN, isLoading: isVPNLoading } = useVPNDetection();
  const [showVPNNotification, setShowVPNNotification] = useState(false);
  const [hasShownVPNNotification, setHasShownVPNNotification] = useState(false);
  const [showReviewNotification, setShowReviewNotification] = useState(false);
  const [showCreateReviewModal, setShowCreateReviewModal] = useState(false);
  const [selectedReviewProduct, setSelectedReviewProduct] = useState<any>(null);
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  // Обработка параметра startapp для открытия товара (только один раз при первой загрузке)
  useEffect(() => {
    if (isAuthenticated && !hasHandledDeepLink) {
      const startParam = (window.Telegram?.WebApp?.initDataUnsafe as { start_param?: string } | undefined)?.start_param;
      if (startParam && startParam.startsWith('product_')) {
        const productId = startParam.replace('product_', '');
        // Перенаправляем на страницу товара только один раз при первой загрузке
        setHasHandledDeepLink(true);
        // Используем setTimeout чтобы избежать конфликта с другими навигациями
        setTimeout(() => {
          navigate(`/product/${productId}`, { replace: true });
        }, 100);
      } else {
        // Если нет deep link параметра - помечаем как обработанное
        setHasHandledDeepLink(true);
      }
    }
  }, [isAuthenticated, hasHandledDeepLink, navigate]);

  // Получаем товары, на которые можно оставить отзыв
  const { data: pendingReviewsData } = useQuery({
    queryKey: ['pendingReviews'],
    queryFn: () => reviewApi.getPendingReviews(),
    enabled: isAuthenticated,
    refetchInterval: 60000, // Обновляем каждую минуту
  });

  const createReviewMutation = useMutation({
    mutationFn: (data: any) => reviewApi.createReview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingReviews'] });
      queryClient.invalidateQueries({ queryKey: ['productRating'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Отзыв отправлен! Вам начислено 50 баллов ✨');
      setShowCreateReviewModal(false);
      setSelectedReviewProduct(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка при отправке отзыва';
      toast.error(message);
    },
  });

  const showBottomNav =
    isAuthenticated &&
    location.pathname !== '/auth' &&
    !location.pathname.startsWith('/product/') &&
    location.pathname !== '/checkout' &&
    !location.pathname.startsWith('/payment/') &&
    location.pathname !== '/admin' &&
    location.pathname !== '/crm' &&
    location.pathname !== '/faq';

  // Прокрутка вверх при переходе между страницами
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // Показываем уведомление о VPN, если обнаружен (только один раз при загрузке приложения)
  // При новом заходе компонент размонтируется и смонтируется заново, состояние сбросится
  useEffect(() => {
    if (isAuthenticated && !isVPNLoading && isVPN && !hasShownVPNNotification) {
      // Показываем сразу, без задержки
      setShowVPNNotification(true);
      setHasShownVPNNotification(true);
    }
  }, [isAuthenticated, isVPN, isVPNLoading, hasShownVPNNotification]);

  // Показываем уведомление о возможности оставить отзыв
  useEffect(() => {
    if (
      isAuthenticated &&
      pendingReviewsData?.products &&
      pendingReviewsData.products.length > 0 &&
      !showCreateReviewModal &&
      location.pathname !== '/checkout' &&
      !location.pathname.startsWith('/payment/')
    ) {
      // Показываем уведомление через 3 секунды после загрузки
      const timer = setTimeout(() => {
        setShowReviewNotification(true);
        setSelectedReviewProduct(pendingReviewsData.products[0]);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShowReviewNotification(false);
    }
  }, [isAuthenticated, pendingReviewsData, showCreateReviewModal, location.pathname]);

  const handleCloseVPNNotification = () => {
    setShowVPNNotification(false);
    markVPNNotificationShown();
  };

  const handleReviewClick = () => {
    if (selectedReviewProduct) {
      setShowReviewNotification(false);
      setShowCreateReviewModal(true);
    }
  };

  const handleCreateReview = async (data: any) => {
    await createReviewMutation.mutateAsync({
      ...data,
      productId: selectedReviewProduct.productId,
      orderId: selectedReviewProduct.orderId,
    });
  };

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
          path="/referrals"
          element={isAuthenticated ? <ReferralPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/orders"
          element={isAuthenticated ? <OrdersPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/payment/:orderId"
          element={isAuthenticated ? <PaymentPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/admin"
          element={isAuthenticated ? <AdminPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/crm"
          element={isAuthenticated ? <CrmPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/faq"
          element={isAuthenticated ? <FAQPage /> : <Navigate to="/auth" replace />}
        />
        <Route
          path="/reviews"
          element={isAuthenticated ? <AllReviewsPage /> : <Navigate to="/auth" replace />}
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} replace />} />
      </Routes>
      {showBottomNav && <BottomNav />}
      {isAuthenticated && (
        <>
          <VPNNotification isVisible={showVPNNotification} onClose={handleCloseVPNNotification} />
          {selectedReviewProduct && (
            <>
              <ReviewNotification
                isVisible={showReviewNotification}
                product={selectedReviewProduct}
                onClose={() => setShowReviewNotification(false)}
                onReview={handleReviewClick}
              />
              <CreateReviewModal
                isOpen={showCreateReviewModal}
                onClose={() => {
                  setShowCreateReviewModal(false);
                  setSelectedReviewProduct(null);
                }}
                onSubmit={handleCreateReview}
                productId={selectedReviewProduct.productId}
                productName={selectedReviewProduct.productName}
                productImageUrl={selectedReviewProduct.productImageUrl}
                orderId={selectedReviewProduct.orderId}
                isLoading={createReviewMutation.isPending}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

export default App;
