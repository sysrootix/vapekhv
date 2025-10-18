import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Gift, TrendingUp, Percent, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { bonusApi, BonusTransaction } from '../api/bonus';
import { useTelegramBackButton } from '../hooks/useTelegramApp';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCallback } from 'react';

export default function BonusPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['bonus'],
    queryFn: bonusApi.getBonusInfo,
  });

  // Telegram BackButton
  const handleBack = useCallback(() => navigate('/'), [navigate]);
  useTelegramBackButton(handleBack);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 bg-tg-bg">
        <div className="text-center">
          <p className="text-red-500 mb-4">Ошибка загрузки</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-2"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-tg-button rounded-full flex items-center justify-center mx-auto mb-3"
          >
            <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tg-text mb-1.5">Бонусная программа</h1>
          <p className="text-sm sm:text-base text-tg-hint">Копите бонусы и получайте скидки</p>
        </motion.div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-tg-button to-pink-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-2xl"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-24 sm:h-24 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium opacity-90">Доступно для оплаты</span>
            </div>
            <div className="text-4xl sm:text-5xl font-bold mb-4 sm:mb-6">{data?.balance || 0} ₽</div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white border-opacity-20">
              <div>
                <p className="text-xs sm:text-sm opacity-75 mb-1">Всего потрачено</p>
                <p className="text-base sm:text-lg font-semibold">{data?.totalSpent.toLocaleString() || 0} ₽</p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm opacity-75 mb-1">Накоплено бонусов</p>
                <p className="text-base sm:text-lg font-semibold">{data?.balance.toLocaleString() || 0} ₽</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Program Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-tg-text mb-3 sm:mb-4">Как работает программа</h2>

          <div className="grid gap-2.5 sm:gap-3">
            <BonusFeatureCard
              icon={<Percent className="w-6 h-6" />}
              title={`${data?.program.firstOrderDiscount}% скидка`}
              subtitle="на первый заказ"
              description={
                data?.firstOrderAvailable
                  ? 'Доступна при следующем заказе'
                  : 'Уже использована'
              }
              available={data?.firstOrderAvailable || false}
              gradient="from-green-500 to-emerald-600"
            />

            <BonusFeatureCard
              icon={<TrendingUp className="w-6 h-6" />}
              title={`${data?.program.earnRate}% бонусами`}
              subtitle="с каждой покупки"
              description="Бонусы начисляются после оплаты заказа"
              available={true}
              gradient="from-blue-500 to-cyan-600"
            />

            <BonusFeatureCard
              icon={<Gift className="w-6 h-6" />}
              title={`До ${data?.program.maxUsage}% оплата`}
              subtitle="бонусами"
              description="Используйте бонусы при оформлении заказа"
              available={true}
              gradient="from-purple-500 to-pink-600"
            />
          </div>
        </motion.div>

        {/* History */}
        {data?.transactions && data.transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-tg-text mb-3 sm:mb-4">История операций</h2>
            <div className="space-y-2 sm:space-y-3">
              {data.transactions.map((transaction, index) => (
                <TransactionItem key={transaction.id} transaction={transaction} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function BonusFeatureCard({
  icon,
  title,
  subtitle,
  description,
  available,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  available: boolean;
  gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-tg-secondary-bg rounded-xl sm:rounded-2xl p-4 sm:p-5 ${available ? '' : 'opacity-50'}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg flex-shrink-0`}>
          <div className="w-5 h-5 sm:w-6 sm:h-6">
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-tg-text">{title}</h3>
            <span className="text-xs sm:text-sm text-tg-hint">{subtitle}</span>
          </div>
          <p className="text-xs sm:text-sm text-tg-hint leading-relaxed">{description}</p>
          {!available && (
            <div className="inline-block mt-2 px-2 py-1 bg-tg-hint bg-opacity-10 text-tg-hint text-xs rounded-lg">
              Уже использована
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionItem({
  transaction,
  index,
}: {
  transaction: BonusTransaction;
  index: number;
}) {
  const isPositive = transaction.amount > 0;
  const typeLabels: Record<string, string> = {
    EARNED: 'Начислено',
    SPENT: 'Списано',
    GIFT: 'Подарок',
    EXPIRED: 'Истекли',
    REFUND: 'Возврат',
    REFERRAL: 'Бонус за друга',
    PROMO: 'Промокод',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-tg-bg transition-colors"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
        <div
          className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
            isPositive ? 'bg-green-500 bg-opacity-10' : 'bg-red-500 bg-opacity-10'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base text-tg-text font-medium truncate">{typeLabels[transaction.type]}</p>
          {transaction.description && (
            <p className="text-xs text-tg-hint truncate">{transaction.description}</p>
          )}
          <p className="text-xs text-tg-hint">
            {format(new Date(transaction.createdAt), 'dd MMM yyyy, HH:mm', { locale: ru })}
          </p>
        </div>
      </div>
      <div
        className={`text-base sm:text-lg font-bold flex-shrink-0 ml-2 ${
          isPositive ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {isPositive ? '+' : ''}{transaction.amount} ₽
      </div>
    </motion.div>
  );
}
