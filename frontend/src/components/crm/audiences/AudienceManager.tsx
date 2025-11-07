import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, Users, Plus, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { adminApi, AudienceListItem } from '../../../api/admin';
import { AudienceFormModal } from './AudienceFormModal';

interface AudienceManagerProps {
  selectedAudienceId: string | null;
  onSelectAudience: (audienceId: string | null) => void;
}

export function AudienceManager({ selectedAudienceId, onSelectAudience }: AudienceManagerProps) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [audienceToEdit, setAudienceToEdit] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: audiences, isLoading, isFetching } = useQuery({
    queryKey: ['crm-audiences'],
    queryFn: adminApi.getAudiences,
  });

  const deleteMutation = useMutation({
    mutationFn: (audienceId: string) => adminApi.deleteAudience(audienceId),
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['crm-audiences'] });
      toast.success('Аудитория удалена');
      if (selectedAudienceId === id) {
        onSelectAudience(null);
      }
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Не удалось удалить аудиторию';
      toast.error(message);
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const openCreateModal = () => {
    setAudienceToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (audienceId: string) => {
    setAudienceToEdit(audienceId);
    setIsModalOpen(true);
  };

  const handleDelete = (audience: AudienceListItem) => {
    if (deletingId && deletingId !== audience.id) {
      return;
    }

    const confirmed = window.confirm(`Удалить аудиторию «${audience.name}»?`);
    if (!confirmed) {
      return;
    }

    deleteMutation.mutate(audience.id);
  };

  const handleSaved = (audienceId: string) => {
    onSelectAudience(audienceId);
    setIsModalOpen(false);
  };

  const selected = audiences?.find((item) => item.id === selectedAudienceId);

  return (
    <>
      <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold text-tg-text">Аудитории</div>
            <p className="text-sm text-tg-hint">Сохраненные сегменты для точечных рассылок</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tg-button text-tg-button-text font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Создать
          </button>
        </div>

        {selected && (
          <div className="p-4 rounded-xl bg-tg-bg flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-tg-hint uppercase mb-1">Выбрана аудитория</div>
              <div className="text-base font-semibold text-tg-text">{selected.name}</div>
              {selected.description && (
                <p className="text-sm text-tg-hint line-clamp-1">{selected.description}</p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-300 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {selected.userCount.toLocaleString('ru-RU')} чел
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-tg-hint">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : audiences && audiences.length > 0 ? (
          <div className="space-y-3">
            {audiences.map((audience) => {
              const isSelected = audience.id === selectedAudienceId;
              return (
                <div
                  key={audience.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-colors ${
                    isSelected
                      ? 'border-tg-button bg-tg-button/10'
                      : 'border-transparent bg-tg-bg hover:bg-tg-bg/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-tg-text">{audience.name}</div>
                      {audience.description && (
                        <p className="text-sm text-tg-hint mt-1">{audience.description}</p>
                      )}
                      <div className="text-xs text-tg-hint mt-2">
                        Обновлено:{' '}
                        {audience.updatedAt
                          ? new Date(audience.updatedAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : '—'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-tg-secondary-bg rounded-full text-sm text-tg-text">
                        <Users className="w-4 h-4" />
                        {audience.userCount.toLocaleString('ru-RU')}
                      </div>
                      <button
                        onClick={() => onSelectAudience(audience.id)}
                        className="text-sm text-tg-button hover:opacity-80 transition-opacity"
                      >
                        Использовать
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button
                      onClick={() => openEditModal(audience.id)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-tg-secondary-bg text-sm text-tg-text hover:bg-opacity-80 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(audience)}
                      disabled={deletingId === audience.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 text-sm text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {deletingId === audience.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <div className="text-tg-text font-semibold">Аудиторий пока нет</div>
            <p className="text-sm text-tg-hint">
              Создайте первую аудиторию по фильтрам и используйте её в рассылках
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-tg-bg text-tg-text hover:bg-opacity-80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Создать аудиторию
            </button>
          </div>
        )}

        {isFetching && !isLoading && (
          <div className="text-xs text-tg-hint flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            Обновляем список...
          </div>
        )}
      </div>

      <AudienceFormModal
        open={isModalOpen}
        audienceId={audienceToEdit}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
