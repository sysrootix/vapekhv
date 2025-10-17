/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  Telegram?: {
    WebApp: {
      initData: string;
      initDataUnsafe: Record<string, unknown>;
      themeParams: Record<string, string>;
      colorScheme: 'light' | 'dark';
      expand: () => void;
      ready: () => void;
      close: () => void;
      HapticFeedback: {
        impactOccurred: (style: string) => void;
        notificationOccurred: (type: string) => void;
        selectionChanged: () => void;
      };
    };
  };
}

