import { AnimatePresence, motion } from 'framer-motion';
import { X, Gift, Clock, CheckCircle, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ReferralEntry, ReferralStatus } from '../api/referral';

interface ReferralDetailsModalProps {
  referral: ReferralEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusMeta: Record<ReferralStatus, { title: string; description: string; icon: React.ComponentType<{ className?: string }>; accent: string }> = {
  PENDING: {
    title: 'Ожидаем первый заказ',
    description: 'Друг уже открыл приложение. Бонус начислится после первой покупки.',
    icon: Clock,
    accent: 'text-yellow-400',
  },
  QUALIFIED: {
    title: 'Заказ оформлен',
    description: 'Друг оформил заказ. Как только он будет доставлен — бонус станет доступен.',
    icon: Gift,
    accent: 'text-blue-400',
  },
  REWARDED: {
    title: 'Бонус начислен',
    description: 'Вы получили бонус за этого друга. Спасибо за приглашение!',
    icon: CheckCircle,
    accent: 'text-emerald-400',
  },
  CANCELLED: {
    title: 'Бонус недоступен',
    description: 'Бонус не может быть начислен. Попробуйте пригласить друга снова.',
    icon: X,
    accent: 'text-red-400',
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'd MMMM yyyy, HH:mm', { locale: ru });
  } catch (error) {
    return '—';
  }
};

export default function ReferralDetailsModal({ referral, isOpen, onClose }: ReferralDetailsModalProps) {
  if (!referral) return null;

  const meta = statusMeta[referral.status];
  const Icon = meta.icon;
  const inviteeName = referral.invitee.firstName
    ? `${referral.invitee.firstName}${referral.invitee.lastName ? ` ${referral.invitee.lastName}` : ''}`
    : referral.invitee.username
      ? `@${referral.invitee.username}`
      : 'Приглашённый друг';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="fixed inset-x-0 bottom-0 z-[110] bg-tg-secondary-bg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-tg-bg transition-colors"
            >
              <X className="w-5 h-5 text-tg-hint" />
            </button>

            <div className="flex items-center gap-4 mb-6 pr-8">
              <div className="w-16 h-16 rounded-2xl bg-tg-bg flex items-center justify-center text-tg-button">
                <UserIcon className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-tg-hint">Приглашённый друг</p>
                <h3 className="text-lg font-semibold text-tg-text">{inviteeName}</h3>
                <p className="text-xs text-tg-hint">Присоединился: {formatDate(referral.invitee.createdAt)}</p>
              </div>
            </div>

            <div className="bg-tg-bg rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-tg-secondary-bg flex items-center justify-center ${meta.accent}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-tg-text">{meta.title}</h4>
                  <p className="text-sm text-tg-hint">{meta.description}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-tg-hint mb-1">Бонус</p>
                  <p className="text-tg-text font-semibold">{referral.bonusAmount.toLocaleString('ru-RU')}₽</p>
                </div>
                <div>
                  <p className="text-tg-hint mb-1">Дата приглашения</p>
                  <p className="text-tg-text">{formatDate(referral.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-tg-bg rounded-2xl p-4">
                <p className="text-tg-hint mb-1">Уведомление отправлено</p>
                <p className="text-tg-text">{formatDate(referral.notifiedAt)}</p>
              </div>
              <div className="bg-tg-bg rounded-2xl p-4">
                <p className="text-tg-hint mb-1">Первый заказ</p>
                <p className="text-tg-text">{formatDate(referral.qualifiedAt)}</p>
              </div>
              <div className="bg-tg-bg rounded-2xl p-4">
                <p className="text-tg-hint mb-1">Бонус начислен</p>
                <p className="text-tg-text">{formatDate(referral.rewardedAt)}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
