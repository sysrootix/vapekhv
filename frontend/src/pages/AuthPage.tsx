import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useTelegramInitData } from '../hooks/useTelegramApp';

export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const initData = useTelegramInitData();
  const referralCode = useMemo(() => {
    const fromInitData = (window.Telegram?.WebApp?.initDataUnsafe as { start_param?: string } | undefined)?.start_param;
    const fromQuery = new URLSearchParams(window.location.search).get('ref');
    const raw = fromInitData || fromQuery;
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }, [initData]);

  const loginMutation = useMutation({
    mutationFn: authApi.telegramLogin,
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success('Добро пожаловать!');
      navigate('/profile');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : 'Ошибка авторизации';
      toast.error(errorMessage || 'Ошибка авторизации');
    },
  });

  useEffect(() => {
    // Автоматическая авторизация при наличии initData
    if (initData && !loginMutation.isPending) {
      loginMutation.mutate({ initData, referralCode });
    }
  }, [initData, loginMutation, referralCode]);

  const handleLogin = () => {
    if (initData) {
      loginMutation.mutate({ initData, referralCode });
    } else {
      toast.error('Откройте приложение через Telegram');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-tg-bg">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-tg-button mb-6"
          >
            <LogIn className="w-10 h-10 text-tg-button-text" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-tg-text mb-2">
            Добро пожаловать!
          </h1>
          <p className="text-tg-hint">
            Войдите через Telegram, чтобы продолжить
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLogin}
          disabled={loginMutation.isPending}
          className="w-full py-4 px-6 bg-tg-button text-tg-button-text rounded-2xl font-semibold text-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loginMutation.isPending ? 'Вход...' : 'Войти через Telegram'}
        </motion.button>

        <p className="text-center text-sm text-tg-hint">
          Нажимая кнопку, вы соглашаетесь с условиями использования
        </p>
      </motion.div>
    </div>
  );
}
