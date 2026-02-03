import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Info, Truck, CreditCard, Gift, ShoppingBag, Shield } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramBackButton } from '../hooks/useTelegramApp';

interface FAQItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

interface FAQSection {
  title: string;
  items: FAQItem[];
}

const faqData: FAQSection[] = [
  {
    title: 'О магазине',
    items: [
      {
        question: 'Что такое VapeKHV?',
        answer: 'VapeKHV - это Telegram магазин вейп-продукции в Хабаровске. Мы работаем через удобное приложение прямо в Telegram, что позволяет вам быстро и удобно делать заказы.',
        icon: <Info className="w-5 h-5" />,
      },
      {
        question: 'Как сделать заказ?',
        answer: 'Просто выберите товары в каталоге, добавьте их в корзину, укажите адрес доставки и контактные данные. После оформления заказа с вами свяжется наш менеджер для подтверждения.',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        question: 'Как связаться с поддержкой?',
        answer: 'Вы можете написать нам в Telegram. Мы работаем 24/7.',
        icon: <Info className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Доставка',
    items: [
      {
        question: 'Какие условия доставки?',
        answer: 'Стоимость доставки зависит от суммы заказа:\n• При заказе менее 3000₽ - доставка 700₽\n• При заказе от 3000₽ - доставка 500₽\n• При заказе от 4500₽ - доставка 300₽\n• При заказе от 6000₽ - бесплатная доставка\n\nМинимальная сумма заказа - 100₽.',
        icon: <Truck className="w-5 h-5" />,
      },
      {
        question: 'Как быстро доставите заказ?',
        answer: 'Доставка по Хабаровску осуществляется в течении часа при выборе "Ближайшее время" при оформлении заказа. Точное время доставки согласовывается с менеджером.',
        icon: <Truck className="w-5 h-5" />,
      },
      {
        question: 'Доставляете ли в другие города?',
        answer: 'На данный момент мы осуществляем доставку только по Хабаровску. Доставка в другие города региона обсуждается индивидуально.',
        icon: <Truck className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Оплата',
    items: [
      {
        question: 'Какие способы оплаты доступны?',
        answer: 'Мы принимаем:\n• Переводы по СБП\n• Перевод на карту\n• Оплата бонусами (до 50% от суммы заказа)',
        icon: <CreditCard className="w-5 h-5" />,
      },
      {
        question: 'Можно ли оплатить бонусами?',
        answer: 'Да! Вы можете оплатить до 50% от суммы заказа бонусными баллами. Бонусы начисляются за каждую покупку и накапливаются на вашем счете.',
        icon: <Gift className="w-5 h-5" />,
      },
      {
        question: 'Безопасна ли оплата картой?',
        answer: 'Да, оплата картой абсолютно безопасна. Мы используем защищенные платежные шлюзы, которые соответствуют международным стандартам безопасности PCI DSS.',
        icon: <Shield className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Бонусная программа',
    items: [
      {
        question: 'Как работает бонусная программа?',
        answer: 'За каждую покупку вы получаете бонусные баллы (5% от суммы заказа). Бонусы можно использовать для оплаты следующих заказов - до 50% от суммы.',
        icon: <Gift className="w-5 h-5" />,
      },
      {
        question: 'Когда начисляются бонусы?',
        answer: 'Бонусы начисляются автоматически после получения заказа. Они становятся доступны для использования сразу после завершения заказа.',
        icon: <Gift className="w-5 h-5" />,
      },
      {
        question: 'Сгорают ли бонусы?',
        answer: 'Бонусы действительны в течение 6 месяцев с момента начисления. Если за это время вы не используете их, они автоматически списываются.',
        icon: <Gift className="w-5 h-5" />,
      },
    ],
  },
  {
    title: 'Товары и качество',
    items: [
      {
        question: 'Все ли товары оригинальные?',
        answer: 'Да, мы работаем только с официальными поставщиками и гарантируем оригинальность всех товаров. На каждый продукт есть соответствующие сертификаты.',
        icon: <Shield className="w-5 h-5" />,
      },
      {
        question: 'Можно ли вернуть товар?',
        answer: 'Возврат товара возможен в течение 14 дней с момента покупки, если товар не был в использовании и сохранена оригинальная упаковка. Жидкости после вскрытия возврату не подлежат.',
        icon: <ShoppingBag className="w-5 h-5" />,
      },
      {
        question: 'Что делать, если товар бракованный?',
        answer: 'Если вы обнаружили брак, свяжитесь с нами в течение 24 часов после получения заказа. Мы бесплатно заменим товар или вернем деньги.',
        icon: <Shield className="w-5 h-5" />,
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onClick }: { item: FAQItem; isOpen: boolean; onClick: () => void }) {
  return (
    <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
      <button
        onClick={onClick}
        className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-tg-bg/50 transition-colors"
      >
        <div className="text-tg-button flex-shrink-0">{item.icon}</div>
        <span className="flex-1 text-tg-text font-medium">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-tg-hint flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 pl-12">
              <p className="text-tg-hint text-sm whitespace-pre-line leading-relaxed">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<{ [key: string]: boolean }>({});

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/profile'), [navigate]);
  useTelegramBackButton(handleBack);

  const toggleItem = (sectionIndex: number, itemIndex: number) => {
    const key = `${sectionIndex}-${itemIndex}`;
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-3xl font-bold text-tg-text mb-2">Часто задаваемые вопросы</h1>
          <p className="text-tg-hint">Ответы на популярные вопросы о нашем магазине</p>
        </motion.div>

        {/* FAQ Sections */}
        {faqData.map((section, sectionIndex) => (
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
            className="space-y-3"
          >
            <h2 className="text-xl font-bold text-tg-text mb-3">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <AccordionItem
                  key={itemIndex}
                  item={item}
                  isOpen={openItems[`${sectionIndex}-${itemIndex}`] || false}
                  onClick={() => toggleItem(sectionIndex, itemIndex)}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Contact Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-tg-button/10 to-tg-button/5 rounded-2xl p-6 text-center mt-8"
        >
          <h3 className="text-lg font-bold text-tg-text mb-2">Не нашли ответ?</h3>
          <p className="text-tg-hint mb-4">
            Свяжитесь с нами, и мы с радостью поможем вам!
          </p>
          <a
            href={import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-tg-button text-tg-button-text px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Написать в Telegram
          </a>
        </motion.div>
      </div>
    </div>
  );
}
