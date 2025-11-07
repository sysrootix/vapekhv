import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Users, Eye, Save, X } from 'lucide-react';
import {
  adminApi,
  AudienceFilters,
  AudiencePayload,
  AudiencePreviewResponse,
} from '../../../api/admin';
import { AudienceFiltersEditor } from './AudienceFiltersEditor';

interface AudienceFormModalProps {
  open: boolean;
  audienceId?: string | null;
  onClose: () => void;
  onSaved?: (audienceId: string) => void;
}

export function AudienceFormModal({ open, audienceId, onClose, onSaved }: AudienceFormModalProps) {
  const isEdit = Boolean(audienceId);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<AudienceFilters>({});
  const [preview, setPreview] = useState<AudiencePreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { data: existingAudience, isLoading: isAudienceLoading } = useQuery(
    ['crm-audience', audienceId],
    () => adminApi.getAudience(audienceId!),
    {
      enabled: open && isEdit && Boolean(audienceId),
    }
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEdit) {
      if (existingAudience?.audience) {
        setName(existingAudience.audience.name);
        setDescription(existingAudience.audience.description ?? '');
        setFilters(existingAudience.audience.filters ?? {});
        setPreview(null);
      }
    } else {
      setName('');
      setDescription('');
      setFilters({});
      setPreview(null);
    }
  }, [open, isEdit, existingAudience]);

  useEffect(() => {
    setPreview(null);
  }, [filters]);

  const mutation = useMutation({
    mutationFn: (payload: AudiencePayload) =>
      audienceId ? adminApi.updateAudience(audienceId, payload) : adminApi.createAudience(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['crm-audiences'] });
      if (audienceId) {
        queryClient.invalidateQueries({ queryKey: ['crm-audience', audienceId] });
      }
      toast.success(audienceId ? 'Аудитория обновлена' : 'Аудитория создана');
      onSaved?.(result.audience.id);
      onClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Не удалось сохранить аудиторию';
      toast.error(message);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Введите название аудитории');
      return;
    }

    const payload: AudiencePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      filters,
    };

    mutation.mutate(payload);
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const data = await adminApi.previewAudienceFilters(filters);
      setPreview(data);
      toast.success(`Найдено ${data.totalUsers} пользователей`);
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Не удалось построить предпросмотр';
      toast.error(message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const renderPreviewTable = (previewData: AudiencePreviewResponse) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-tg-text">Найдено пользователей</div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tg-bg rounded-full text-sm font-semibold text-tg-text">
          <Users className="w-4 h-4" />
          {previewData.totalUsers.toLocaleString('ru-RU')}
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {previewData.users.length === 0 && (
          <div className="text-sm text-tg-hint">Нет пользователей, подходящих под условия</div>
        )}
        {previewData.users.map((user) => (
          <div key={user.id} className="bg-tg-bg rounded-xl p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-tg-text">
                {user.firstName || user.lastName
                  ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
                  : user.username
                    ? `@${user.username}`
                    : `ID ${user.telegramId}`}
              </div>
              <div className="text-xs text-tg-hint">
                {user.ordersCount} заказов · бонусов: {user.bonusPoints}
              </div>
            </div>
            <div className="text-right text-xs text-tg-hint">
              <div>Последний заказ: {user.daysSinceLastOrder ?? '—'} дн</div>
              <div>Last login: {user.daysSinceLastLogin} дн</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="bg-tg-secondary-bg rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-tg-button/10">
              <div>
                <div className="text-lg sm:text-xl font-bold text-tg-text mb-1">
                  {isEdit ? 'Редактировать аудиторию' : 'Новая аудитория'}
                </div>
                <p className="text-sm text-tg-hint">
                  Соберите сегмент по условиям и сохраните для рассылок
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-tg-bg text-tg-text hover:bg-opacity-80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isEdit && isAudienceLoading ? (
                <div className="flex justify-center py-10 text-tg-hint">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tg-text">Название *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Например, VIP клиенты 30+ дней без заказов"
                        className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-tg-text">Описание</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Для чего используется аудитория"
                        className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-tg-text">Фильтры</div>
                        <p className="text-sm text-tg-hint">
                          Оставьте пустыми, чтобы не ограничивать по параметру
                        </p>
                      </div>
                      <button
                        onClick={() => setFilters({})}
                        className="text-sm text-tg-button hover:opacity-80 transition-opacity"
                      >
                        Сбросить фильтры
                      </button>
                    </div>
                    <AudienceFiltersEditor value={filters} onChange={setFilters} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-semibold text-tg-text">Предпросмотр</div>
                        <p className="text-sm text-tg-hint">
                          Узнайте, сколько пользователей попадут в сегмент
                        </p>
                      </div>
                      <button
                        onClick={handlePreview}
                        disabled={isPreviewLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tg-bg text-tg-text hover:bg-opacity-80 transition-colors disabled:opacity-50"
                      >
                        {isPreviewLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        Построить
                      </button>
                    </div>
                    {isPreviewLoading && (
                      <div className="text-sm text-tg-hint flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Считаем аудиторию...
                      </div>
                    )}
                    {preview && renderPreviewTable(preview)}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-tg-button/10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-tg-bg text-tg-text hover:bg-opacity-80 transition-colors"
              >
                Отменить
              </button>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending}
                className="flex-1 px-4 py-3 rounded-xl bg-tg-button text-tg-button-text font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Сохраняем...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {isEdit ? 'Обновить' : 'Создать'} аудиторию
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
