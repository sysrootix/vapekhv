import { useEffect, useState } from 'react';

// Telegram WebApp types are defined in vite-env.d.ts

export function useTelegramApp() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      
      if (tg) {
        // Apply theme
        const theme = tg.themeParams;
        const root = document.documentElement;
        
        if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
        if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
        if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
        if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
        if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
        if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
        if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);

        // Apply color scheme class
        if (tg.colorScheme === 'dark') {
          document.body.classList.add('dark');
        } else {
          document.body.classList.remove('dark');
        }

        // Expand app
        tg.expand();
        tg.ready();
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing Telegram App:', error);
      setIsInitialized(true); // Все равно показываем приложение
    }
  }, []);

  return {
    isInitialized,
    webApp: window.Telegram?.WebApp,
  };
}

export function useTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export function useTelegramInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

export function useHapticFeedback() {
  const haptic = window.Telegram?.WebApp?.HapticFeedback;

  return {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      haptic?.impactOccurred(style);
    },
    notificationOccurred: (type: 'error' | 'success' | 'warning') => {
      haptic?.notificationOccurred(type);
    },
    selectionChanged: () => {
      haptic?.selectionChanged();
    },
  };
}

