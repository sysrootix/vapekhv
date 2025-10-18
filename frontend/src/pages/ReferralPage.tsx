import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Share2, Users, Gift, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { referralApi, ReferralEntry, ReferralStatus } from '../api/referral';
import ReferralDetailsModal from '../components/ReferralDetailsModal';
import LoadingScreen from '../components/LoadingScreen';
import { useTelegramBackButton } from '../hooks/useTelegramApp';

const statusBadgeStyles: Record<ReferralStatus, { bg: string; text: string; label: string }> = {
  PENDING: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    label: 'Ожидаем заказ',
  },
  QUALIFIED: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    label: 'В пути',
  },
  REWARDED: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    label: 'Бонус начислен',
  },
  CANCELLED: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Бонус недоступен',
  },
};

const formatName = (referral: ReferralEntry): string => {
  const { firstName, lastName, username } = referral.invitee;
  if (firstName) {
    return `${firstName}${lastName ? ` ${lastName}` : ''}`;
  }
  if (username) {
    return `@${username}`;
  }
  return 'Приглашённый друг';
};

export default function ReferralPage() {
  const navigate = useNavigate();
  const [selectedReferral, setSelectedReferral] = useState<ReferralEntry | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useTelegramBackButton(() => navigate('/profile'));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['referrals'],
    queryFn: referralApi.getOverview,
  });

  const referrals = data?.referrals ?? [];

  const sharePayload = useMemo(() => {
    if (!data) return null;
    return {
      title: 'Приглашаю тебя в VapeKHV',
      text: `Используй мой реферальный код ${data.code} и получи бонусы при первой покупке!`,
      url: data.link,
    };
  }, [data]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      toast.success('Ссылка скопирована');
    } catch (copyError) {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const handleShare = async () => {
    if (!sharePayload) return;
    if (navigator.share) {
      try {
        await navigator.share(sharePayload);
      } catch (shareError) {
        if ((shareError as { name?: string }).name !== 'AbortError') {
          toast.error('Не удалось поделиться ссылкой');
        }
      }
    } else {
      await handleCopy();
      toast('Ссылка скопирована. Отправьте её другу в Telegram!');
    }
  };

  const openReferralDetails = (referral: ReferralEntry) => {
    setSelectedReferral(referral);
    setModalOpen(true);
  };

  const closeReferralDetails = () => {
    setModalOpen(false);
    setSelectedReferral(null);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-tg-bg flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-tg-hint">Не удалось загрузить реферальную программу</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-tg-button text-tg-button-text rounded-xl"
          >
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tg-bg pb-24">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/profile')}
            className="p-2 rounded-lg hover:bg-tg-secondary-bg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-tg-text" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-tg-text">Реферальная программа</h1>
            <p className="text-sm text-tg-hint">Получайте бонусы за приглашённых друзей</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tg-secondary-bg rounded-3xl p-6 shadow-lg space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-tg-hint mb-1">Ваш код</p>
              <p className="text-3xl font-bold tracking-widest text-tg-text">{data.code}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="p-3 rounded-2xl bg-tg-bg text-tg-text hover:opacity-80 transition"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                className="p-3 rounded-2xl bg-tg-button text-tg-button-text hover:opacity-90 transition"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-tg-bg rounded-2xl p-4 flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-tg-hint">Бонус за каждого друга</p>
              <p className="text-lg font-semibold text-tg-text">
                {data.bonusPerReferral.toLocaleString('ru-RU')}₽
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-tg-secondary-bg rounded-3xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-tg-bg text-tg-text">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-tg-text">Статистика</h2>
              <p className="text-sm text-tg-hint">Сколько бонусов вы уже получили</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-tg-bg rounded-2xl p-4">
              <p className="text-tg-hint mb-1">Всего приглашено</p>
              <p className="text-xl font-semibold text-tg-text">{data.stats.total}</p>
            </div>
            <div className="bg-tg-bg rounded-2xl p-4">
              <p className="text-tg-hint mb-1">Бонус начислен</p>
              <p className="text-xl font-semibold text-emerald-400">{data.stats.rewarded}</p>
            </div>
            <div className="bg-tg-bg rounded-2xl p-4">
              <p className="text-tg-hint mb-1">Ожидают заказ</p>
              <p className="text-xl font-semibold text-yellow-400">{data.stats.pending}</p>
            </div>
            <div className="bg-tg-bg rounded-2xl p-4">
              <p className="text-tg-hint mb-1">Получено бонусов</p>
              <p className="text-xl font-semibold text-tg-text">
                {data.stats.totalEarned.toLocaleString('ru-RU')}₽
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-tg-text">Приглашённые друзья</h2>
            <p className="text-sm text-tg-hint">Нажмите, чтобы посмотреть детали</p>
          </div>

          {referrals.length === 0 ? (
            <div className="bg-tg-secondary-bg rounded-3xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-tg-bg flex items-center justify-center text-tg-text">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-tg-text">Пока никого</p>
                <p className="text-sm text-tg-hint">
                  Отправьте ссылку другу и получите бонус после его первой покупки.
                </p>
              </div>
              <button
                onClick={handleShare}
                className="w-full py-3 bg-tg-button text-tg-button-text rounded-2xl font-semibold hover:opacity-90 transition"
              >
                Поделиться ссылкой
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => {
                const status = statusBadgeStyles[referral.status];
                return (
                  <motion.button
                    type="button"
                    key={referral.id}
                    onClick={() => openReferralDetails(referral)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-left bg-tg-secondary-bg rounded-2xl p-4 flex items-center justify-between gap-4 hover:bg-tg-bg transition"
                  >
                    <div>
                      <p className="text-base font-semibold text-tg-text">{formatName(referral)}</p>
                      <p className="text-sm text-tg-hint">Бонус {referral.bonusAmount.toLocaleString('ru-RU')}₽</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <ReferralDetailsModal
        referral={selectedReferral}
        isOpen={isModalOpen}
        onClose={closeReferralDetails}
      />
    </div>
  );
}
