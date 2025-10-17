import { motion } from 'framer-motion';
import { Home, ShoppingBag, ShoppingCart, User as UserIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cartApi } from '../api/cart';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const cartCount = cartData?.count || 0;

  const navItems = [
    {
      icon: Home,
      label: 'Главная',
      path: '/dashboard',
      active: location.pathname === '/dashboard',
    },
    {
      icon: ShoppingBag,
      label: 'Каталог',
      path: '/catalog',
      active: location.pathname === '/catalog',
    },
    {
      icon: ShoppingCart,
      label: 'Корзина',
      path: '/cart',
      active: location.pathname === '/cart',
      badge: cartCount,
    },
    {
      icon: UserIcon,
      label: 'Профиль',
      path: '/profile',
      active: location.pathname === '/profile',
    },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-tg-secondary-bg border-t border-tg-section-separator z-50"
    >
      <div className="flex items-center justify-around max-w-4xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex-1 flex flex-col items-center justify-center py-2 px-1 relative"
            >
              {/* Active Indicator */}
              {item.active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 w-12 h-1 bg-tg-button rounded-b-full"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon Container */}
              <div className="relative">
                <motion.div
                  animate={{
                    scale: item.active ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon
                    className={`w-6 h-6 transition-colors ${
                      item.active ? 'text-tg-button' : 'text-tg-hint'
                    }`}
                  />
                </motion.div>

                {/* Badge */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-xs mt-1 transition-colors ${
                  item.active ? 'text-tg-button font-medium' : 'text-tg-hint'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Safe Area для iPhone */}
      <div className="h-[env(safe-area-inset-bottom)] bg-tg-secondary-bg" />
    </motion.nav>
  );
}

