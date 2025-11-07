import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface VPNDetectionResult {
  isVPN: boolean;
  isLoading: boolean;
  country?: string;
}

export function useVPNDetection(): VPNDetectionResult {
  const [isVPN, setIsVPN] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [country, setCountry] = useState<string | undefined>();

  useEffect(() => {
    // Проверяем страну пользователя через бэкенд API сразу
    const checkVPN = async () => {
      try {
        const response = await apiClient.get<{ country: string; countryCode: string; isVPN: boolean }>('/vpn/check-country');
        const data = response.data;

        setCountry(data.countryCode);
        setIsVPN(data.isVPN);
      } catch (error) {
        // В случае ошибки не показываем уведомление
        console.debug('VPN detection error:', error);
        setIsVPN(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Проверяем сразу, без задержки
    checkVPN();
  }, []);

  return { isVPN, isLoading, country };
}

export function markVPNNotificationShown() {
  // Не сохраняем ничего - плашка будет показываться при каждом новом заходе
  // Используем только состояние компонента для управления показом в текущей сессии
}

export function shouldShowVPNNotification(): boolean {
  // Всегда возвращаем true - плашка будет показываться при каждом обнаружении VPN
  // Управление показом происходит через состояние компонента в App.tsx
  return true;
}


