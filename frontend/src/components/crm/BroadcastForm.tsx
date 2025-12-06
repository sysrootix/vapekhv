import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Image as ImageIcon,
  Video,
  FileText,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  adminApi,
  BroadcastMessage,
  BroadcastTarget,
  BroadcastButton,
} from '../../api/admin';

interface BroadcastFormProps {
  onSuccess?: (result: { total: number; sent: number; failed: number }) => void;
  selectedAudienceId?: string | null;
  onAudienceSelected?: (audienceId: string | null) => void;
}

export function BroadcastForm({ onSuccess, selectedAudienceId, onAudienceSelected }: BroadcastFormProps) {
  const [message, setMessage] = useState<BroadcastMessage>({
    text: '',
    parseMode: 'HTML',
  });
  const [segmentTarget, setSegmentTarget] = useState<BroadcastTarget>({
    segment: 'all',
  });
  const [targetMode, setTargetMode] = useState<'segment' | 'audience'>('segment');
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document' | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [buttonRows, setButtonRows] = useState<BroadcastButton[][]>([]);
  const [currentButtonRow, setCurrentButtonRow] = useState<BroadcastButton[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: audiences } = useQuery({
    queryKey: ['crm-audiences'],
    queryFn: adminApi.getAudiences,
  });
  const selectedAudience = audiences?.find((item) => item.id === selectedAudienceId);

  useEffect(() => {
    if (selectedAudienceId && targetMode === 'segment') {
      setTargetMode('audience');
    }
  }, [selectedAudienceId, targetMode]);

  const sendBroadcastMutation = useMutation({
    mutationFn: ({ message, target }: { message: BroadcastMessage; target: BroadcastTarget }) =>
      adminApi.sendBroadcast(message, target),
    onSuccess: (result) => {
      onSuccess?.(result);
      // Reset form
      setMessage({ text: '', parseMode: 'HTML' });
      setSegmentTarget({ segment: 'all' });
      setTargetMode('segment');
      setMediaType(null);
      setMediaUrl('');
      setMediaCaption('');
      setButtonRows([]);
      setCurrentButtonRow([]);
    },
  });

  const handleAddMedia = () => {
    if (mediaUrl && mediaType) {
      setMessage({
        ...message,
        media: {
          type: mediaType,
          url: mediaUrl,
          caption: mediaCaption || undefined,
        },
      });
      setMediaUrl('');
      setMediaCaption('');
      setMediaType(null);
    }
  };

  const handleRemoveMedia = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { media, ...rest } = message;
    setMessage(rest);
  };

  const handleAddButton = (button: BroadcastButton) => {
    setCurrentButtonRow([...currentButtonRow, button]);
  };

  const handleFinishButtonRow = () => {
    if (currentButtonRow.length > 0) {
      setButtonRows([...buttonRows, currentButtonRow]);
      setCurrentButtonRow([]);
    }
  };

  const handleRemoveButtonRow = (index: number) => {
    setButtonRows(buttonRows.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Добавляем незавершенный ряд кнопок, если он есть
    const allButtonRows = currentButtonRow.length > 0
      ? [...buttonRows, currentButtonRow]
      : buttonRows;

    const finalMessage: BroadcastMessage = {
      ...message,
      buttons: allButtonRows.length > 0 ? allButtonRows : undefined,
    };

    if (targetMode === 'audience' && !selectedAudienceId) {
      toast.error('Выберите сохраненную аудиторию');
      return;
    }

    const targetPayload: BroadcastTarget =
      targetMode === 'audience'
        ? { audienceId: selectedAudienceId || undefined }
        : segmentTarget;

    sendBroadcastMutation.mutate({ message: finalMessage, target: targetPayload });
  };

  const hasAudienceSelected = Boolean(
    selectedAudienceId && audiences?.some((audience) => audience.id === selectedAudienceId)
  );
  const canSubmit =
    message.text.trim().length > 0 &&
    (targetMode === 'segment'
      ? Boolean(segmentTarget.segment)
      : hasAudienceSelected);

  return (
    <div className="space-y-6">
      {/* Message Text */}
      <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-tg-text mb-2">
            Текст сообщения *
          </label>
          <textarea
            value={message.text}
            onChange={(e) => setMessage({ ...message, text: e.target.value })}
            placeholder="Введите текст сообщения..."
            className="w-full min-h-[120px] px-4 py-3 bg-tg-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all resize-none"
            rows={5}
          />
          <div className="flex items-center gap-2 mt-2">
            <select
              value={message.parseMode || 'HTML'}
              onChange={(e) =>
                setMessage({ ...message, parseMode: e.target.value as 'HTML' | 'Markdown' | 'MarkdownV2' })
              }
              className="px-3 py-1.5 bg-tg-bg text-tg-text rounded-lg border-2 border-transparent focus:border-tg-button focus:outline-none text-sm"
            >
              <option value="HTML">HTML</option>
              <option value="Markdown">Markdown</option>
              <option value="MarkdownV2">MarkdownV2</option>
            </select>
            <span className="text-xs text-tg-hint">
              Поддерживаются HTML теги: &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;s&gt;, &lt;a&gt;
            </span>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-tg-text">Медиафайл (опционально)</label>
          {message.media && (
            <button
              onClick={handleRemoveMedia}
              className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Удалить
            </button>
          )}
        </div>

        {!message.media ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setMediaType('photo')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  mediaType === 'photo'
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-bg text-tg-hint hover:bg-tg-bg/70'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                Фото
              </button>
              <button
                onClick={() => setMediaType('video')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  mediaType === 'video'
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-bg text-tg-hint hover:bg-tg-bg/70'
                }`}
              >
                <Video className="w-5 h-5" />
                Видео
              </button>
              <button
                onClick={() => setMediaType('document')}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  mediaType === 'document'
                    ? 'bg-tg-button text-tg-button-text'
                    : 'bg-tg-bg text-tg-hint hover:bg-tg-bg/70'
                }`}
              >
                <FileText className="w-5 h-5" />
                Документ
              </button>
            </div>

            {mediaType && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={`Введите URL ${mediaType === 'photo' ? 'фото' : mediaType === 'video' ? 'видео' : 'документа'}`}
                  className="w-full px-4 py-3 bg-tg-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
                />
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="Подпись к медиафайлу (опционально)"
                  className="w-full px-4 py-3 bg-tg-bg text-tg-text placeholder-tg-hint rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
                />
                <button
                  onClick={handleAddMedia}
                  disabled={!mediaUrl}
                  className="w-full px-4 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Добавить медиафайл
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          <div className="bg-tg-bg rounded-xl p-4 flex items-center gap-3">
            {message.media.type === 'photo' && <ImageIcon className="w-6 h-6 text-tg-button" />}
            {message.media.type === 'video' && <Video className="w-6 h-6 text-tg-button" />}
            {message.media.type === 'document' && <FileText className="w-6 h-6 text-tg-button" />}
            <div className="flex-1">
              <div className="text-sm font-semibold text-tg-text capitalize">
                {message.media.type === 'photo' ? 'Фото' : message.media.type === 'video' ? 'Видео' : 'Документ'}
              </div>
              {message.media.url && (
                <div className="text-xs text-tg-hint truncate">{message.media.url}</div>
              )}
              {message.media.caption && (
                <div className="text-xs text-tg-text mt-1">{message.media.caption}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-tg-text">Кнопки (опционально)</label>
          <span className="text-xs text-tg-hint">Максимум 8 кнопок в ряду</span>
        </div>

        {/* Existing button rows */}
        {buttonRows.map((row, rowIndex) => (
          <div key={rowIndex} className="bg-tg-bg rounded-xl p-3 flex items-center gap-2 flex-wrap">
            {row.map((button, btnIndex) => (
              <div
                key={btnIndex}
                className="px-3 py-1.5 bg-tg-secondary-bg rounded-lg text-sm text-tg-text flex items-center gap-2"
              >
                {button.type === 'url' && <LinkIcon className="w-3 h-3" />}
                {button.type === 'web_app' && <Smartphone className="w-3 h-3" />}
                {button.type === 'callback' && <MessageSquare className="w-3 h-3" />}
                <span>{button.text}</span>
              </div>
            ))}
            <button
              onClick={() => handleRemoveButtonRow(rowIndex)}
              className="ml-auto px-2 py-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Current button row being built */}
        {currentButtonRow.length > 0 && (
          <div className="bg-tg-bg rounded-xl p-3 flex items-center gap-2 flex-wrap">
            {currentButtonRow.map((button, index) => (
              <div
                key={index}
                className="px-3 py-1.5 bg-tg-secondary-bg rounded-lg text-sm text-tg-text flex items-center gap-2"
              >
                {button.type === 'url' && <LinkIcon className="w-3 h-3" />}
                {button.type === 'web_app' && <Smartphone className="w-3 h-3" />}
                {button.type === 'callback' && <MessageSquare className="w-3 h-3" />}
                <span>{button.text}</span>
                <button
                  onClick={() => setCurrentButtonRow(currentButtonRow.filter((_, i) => i !== index))}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {currentButtonRow.length < 8 && (
              <ButtonAdder
                onAdd={handleAddButton}
                onFinish={handleFinishButtonRow}
                disabled={currentButtonRow.length >= 8}
              />
            )}
            {currentButtonRow.length >= 8 && (
              <button
                onClick={handleFinishButtonRow}
                className="px-3 py-1.5 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
              >
                Завершить ряд
              </button>
            )}
          </div>
        )}

        {/* Add first button */}
        {currentButtonRow.length === 0 && buttonRows.length < 10 && (
          <ButtonAdder onAdd={handleAddButton} onFinish={handleFinishButtonRow} />
        )}
      </div>

      {/* Target Audience */}
      <div className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4">
        <label className="block text-sm font-semibold text-tg-text">Целевая аудитория *</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTargetMode('segment')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              targetMode === 'segment'
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-bg text-tg-text hover:bg-tg-bg/80'
            }`}
          >
            Сегменты
          </button>
          <button
            type="button"
            onClick={() => setTargetMode('audience')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
              targetMode === 'audience'
                ? 'bg-tg-button text-tg-button-text'
                : 'bg-tg-bg text-tg-text hover:bg-tg-bg/80'
            }`}
          >
            Сохраненные аудитории
          </button>
        </div>

        {targetMode === 'segment' ? (
          <select
            value={segmentTarget.segment || 'all'}
            onChange={(e) => setSegmentTarget({ ...segmentTarget, segment: e.target.value as any })}
            className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all"
          >
            <option value="all">Все пользователи</option>
            <option value="vip">VIP клиенты</option>
            <option value="new">Новые пользователи</option>
            <option value="active">Активные (30 дней)</option>
            <option value="inactive">Неактивные (60+ дней)</option>
          </select>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedAudienceId ?? ''}
              onChange={(e) => onAudienceSelected?.(e.target.value || null)}
              disabled={!audiences?.length}
              className="w-full px-4 py-3 bg-tg-bg text-tg-text rounded-xl border-2 border-transparent focus:border-tg-button focus:outline-none transition-all disabled:opacity-50"
            >
              <option value="">{audiences?.length ? 'Выберите аудиторию' : 'Нет сохраненных аудиторий'}</option>
              {audiences?.map((audience) => (
                <option key={audience.id} value={audience.id}>
                  {audience.name} · {audience.userCount.toLocaleString('ru-RU')} чел
                </option>
              ))}
            </select>
            <p className="text-xs text-tg-hint">
              Управляйте списком аудиторий в блоке «Аудитории» выше.
            </p>
            {selectedAudience && (
              <div className="bg-tg-bg rounded-xl p-3 flex items-center justify-between gap-3 text-sm text-tg-text">
                <div>
                  <div className="font-semibold">{selectedAudience.name}</div>
                  {selectedAudience.description && (
                    <div className="text-xs text-tg-hint">{selectedAudience.description}</div>
                  )}
                </div>
                <div className="text-right text-xs text-tg-hint">
                  Пользователей
                  <div className="text-lg font-semibold text-tg-text">
                    {selectedAudience.userCount.toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex-1 px-4 py-3 bg-tg-bg text-tg-text rounded-xl font-medium hover:bg-tg-bg/70 transition-colors"
        >
          {showPreview ? 'Скрыть' : 'Показать'} предпросмотр
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || sendBroadcastMutation.isPending}
          className="flex-1 px-4 py-3 bg-tg-button text-tg-button-text rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sendBroadcastMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Отправить рассылку
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-tg-secondary-bg rounded-2xl p-4 sm:p-6 space-y-4"
          >
            <div className="text-sm font-semibold text-tg-text">Предпросмотр сообщения</div>
            <div className="bg-tg-bg rounded-xl p-4 space-y-3">
              {message.media && (
                <div className="bg-tg-secondary-bg rounded-lg p-3 flex items-center gap-3">
                  {message.media.type === 'photo' && <ImageIcon className="w-6 h-6 text-tg-button" />}
                  {message.media.type === 'video' && <Video className="w-6 h-6 text-tg-button" />}
                  {message.media.type === 'document' && <FileText className="w-6 h-6 text-tg-button" />}
                  <div className="text-sm text-tg-text">
                    {message.media.type === 'photo' ? 'Фото' : message.media.type === 'video' ? 'Видео' : 'Документ'}
                  </div>
                </div>
              )}
              <div
                className="text-sm text-tg-text whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: message.text }}
              />
              {(buttonRows.length > 0 || currentButtonRow.length > 0) && (
                <div className="space-y-2 pt-2 border-t border-tg-button/10">
                  {buttonRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex gap-2 flex-wrap">
                      {row.map((button, btnIndex) => (
                        <div
                          key={btnIndex}
                          className="px-3 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium"
                        >
                          {button.text}
                        </div>
                      ))}
                    </div>
                  ))}
                  {currentButtonRow.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {currentButtonRow.map((button, btnIndex) => (
                        <div
                          key={btnIndex}
                          className="px-3 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium opacity-70"
                        >
                          {button.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {sendBroadcastMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Рассылка отправлена!</span>
          </div>
          <div className="text-sm text-tg-text space-y-1">
            <div>Всего получателей: {sendBroadcastMutation.data.total}</div>
            <div className="text-green-400">Отправлено: {sendBroadcastMutation.data.sent}</div>
            {sendBroadcastMutation.data.failed > 0 && (
              <div className="text-red-400">Ошибок: {sendBroadcastMutation.data.failed}</div>
            )}
          </div>
        </motion.div>
      )}

      {sendBroadcastMutation.isError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-2 text-red-400"
        >
          <AlertCircle className="w-5 h-5" />
          <span>Ошибка при отправке рассылки</span>
        </motion.div>
      )}
    </div>
  );
}

interface ButtonAdderProps {
  onAdd: (button: BroadcastButton) => void;
  onFinish: () => void;
  disabled?: boolean;
}

function ButtonAdder({ onAdd, disabled }: ButtonAdderProps) {
  const [showForm, setShowForm] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonType, setButtonType] = useState<'url' | 'web_app' | 'callback'>('url');
  const [buttonValue, setButtonValue] = useState('');

  const handleAdd = () => {
    if (buttonText.trim() && buttonValue.trim()) {
      onAdd({
        text: buttonText.trim(),
        type: buttonType,
        value: buttonValue.trim(),
      });
      setButtonText('');
      setButtonValue('');
      setShowForm(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        disabled={disabled}
        className="px-3 py-1.5 bg-tg-secondary-bg text-tg-text rounded-lg text-sm font-medium hover:bg-tg-secondary-bg/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Добавить кнопку
      </button>
    );
  }

  return (
    <div className="w-full bg-tg-secondary-bg rounded-lg p-3 space-y-2">
      <input
        type="text"
        value={buttonText}
        onChange={(e) => setButtonText(e.target.value)}
        placeholder="Текст кнопки"
        className="w-full px-3 py-2 bg-tg-bg text-tg-text placeholder-tg-hint rounded-lg border-2 border-transparent focus:border-tg-button focus:outline-none transition-all text-sm"
      />
      <select
        value={buttonType}
        onChange={(e) => setButtonType(e.target.value as any)}
        className="w-full px-3 py-2 bg-tg-bg text-tg-text rounded-lg border-2 border-transparent focus:border-tg-button focus:outline-none text-sm"
      >
        <option value="url">Ссылка (URL)</option>
        <option value="web_app">Telegram WebApp</option>
        <option value="callback">Callback (для разработчиков)</option>
      </select>
      <input
        type="text"
        value={buttonValue}
        onChange={(e) => setButtonValue(e.target.value)}
        placeholder={buttonType === 'url' ? 'https://example.com' : buttonType === 'web_app' ? 'https://your-webapp.com' : 'callback_data'}
        className="w-full px-3 py-2 bg-tg-bg text-tg-text placeholder-tg-hint rounded-lg border-2 border-transparent focus:border-tg-button focus:outline-none transition-all text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={!buttonText.trim() || !buttonValue.trim()}
          className="flex-1 px-3 py-2 bg-tg-button text-tg-button-text rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Добавить
        </button>
        <button
          onClick={() => {
            setShowForm(false);
            setButtonText('');
            setButtonValue('');
          }}
          className="px-3 py-2 bg-tg-bg text-tg-text rounded-lg text-sm font-medium hover:bg-tg-bg/70 transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
