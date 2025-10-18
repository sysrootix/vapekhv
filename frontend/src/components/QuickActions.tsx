import { Copy, Phone, MessageCircle, MapPin, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  phone?: string;
  telegramId?: number | string;
  telegramUsername?: string;
  address?: string;
  orderItems?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function QuickActions({ phone, telegramId, telegramUsername, address, orderItems }: QuickActionsProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast.success(`${label} скопирован`);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (error) {
      toast.error('Не удалось скопировать');
    }
  };

  const copyProductsList = () => {
    if (!orderItems || orderItems.length === 0) {
      toast.error('Нет товаров для копирования');
      return;
    }

    const text = orderItems
      .map((item) => `${item.name} × ${item.quantity} = ${(item.price * item.quantity).toLocaleString()}₽`)
      .join('\n');

    copyToClipboard(text, 'Список товаров');
  };

  const callPhone = () => {
    if (!phone) {
      toast.error('Телефон не указан');
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  const openTelegram = () => {
    if (telegramUsername) {
      window.open(`https://t.me/${telegramUsername}`, '_blank');
    } else if (telegramId) {
      // Открыть через tg:// схему (работает только в Telegram)
      window.open(`tg://user?id=${telegramId}`, '_blank');
    } else {
      toast.error('Telegram ID не найден');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Копировать адрес */}
      {address && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => copyToClipboard(address, 'Адрес')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text text-sm font-medium hover:bg-opacity-80 transition-all"
        >
          {copiedItem === 'Адрес' ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          <span>Копировать адрес</span>
        </motion.button>
      )}

      {/* Позвонить */}
      {phone && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={callPhone}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium hover:bg-green-500/20 transition-all"
        >
          <Phone className="w-4 h-4" />
          <span>Позвонить</span>
        </motion.button>
      )}

      {/* Написать в Telegram */}
      {(telegramUsername || telegramId) && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openTelegram}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Telegram</span>
        </motion.button>
      )}

      {/* Копировать список товаров */}
      {orderItems && orderItems.length > 0 && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={copyProductsList}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-tg-secondary-bg text-tg-text text-sm font-medium hover:bg-opacity-80 transition-all"
        >
          {copiedItem === 'Список товаров' ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>Копировать товары</span>
        </motion.button>
      )}
    </div>
  );
}
