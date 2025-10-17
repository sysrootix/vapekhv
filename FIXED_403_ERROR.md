# ✅ Исправлена ошибка 403 Forbidden

## 🔍 Проблема
При открытии `https://vapekhv.live` возникала ошибка **403 Forbidden**.

## 🎯 Причина
Nginx (работает от `www-data`) не мог получить доступ к файлам в `/root/shop/frontend/dist/` из-за прав доступа директории `/root` (права 700 - только для root).

## ✅ Решение

### 1. Создана стандартная web-директория
```bash
/var/www/vapekhv/
```
- **Владелец:** `www-data:www-data`
- **Права:** `755` (drwxr-xr-x)
- **Содержимое:** Собранный React frontend

### 2. Обновлена конфигурация nginx
```nginx
# Было:
root /root/shop/frontend/dist;

# Стало:
root /var/www/vapekhv;
```

### 3. Добавлен trust proxy в Express
```typescript
// backend/src/index.ts
app.set('trust proxy', 1);
```
Исправлена ошибка `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

### 4. Создан автоматический деплой
```bash
# Полный деплой (рекомендуется)
npm run deploy

# Только frontend
npm run deploy:frontend
```

## 📊 Текущее состояние

✅ **Frontend:** https://vapekhv.live/ → HTTP/2 200 OK
✅ **Health Check:** https://vapekhv.live/health → {"status":"ok"}
✅ **Backend API:** https://vapekhv.live/api → Работает
✅ **Telegram Bot:** Запущен, команда /start работает
✅ **Nginx:** Конфигурация валидна
✅ **SSL/HTTPS:** Работает корректно
✅ **Безопасность:** Заголовки установлены
✅ **Rate Limiting:** Активен (10 req/s)

## 🚀 Как обновлять сайт

### При изменении frontend:
```bash
# Автоматически
npm run deploy

# Проверить результат
curl -I https://vapekhv.live/
```

### При изменении backend:
```bash
# Собрать
npm run build:backend

# Перезапустить
pm2 restart vapekhv-backend

# Или в development
npm run dev:backend
```

## 📂 Структура файлов

```
/root/shop/                          # Проект
├── frontend/
│   ├── src/                         # Исходники React
│   └── dist/                        # Сборка (→ копируется в /var/www/)
├── backend/
│   └── src/                         # Backend Node.js
└── scripts/
    └── deploy.sh                    # Скрипт деплоя

/var/www/vapekhv/                    # Production файлы (nginx)
├── index.html
├── assets/
│   ├── index-*.js
│   └── index-*.css
└── robots.txt

/etc/nginx/sites-available/
└── vapekhv.conf                     # Конфигурация nginx
```

## 🔧 Полезные команды

```bash
# Проверить сайт
curl -I https://vapekhv.live/

# Проверить API
curl https://vapekhv.live/health

# Логи nginx
sudo tail -f /var/log/nginx/vapekhv_error.log

# Логи backend
pm2 logs vapekhv-backend

# Статус сервисов
sudo systemctl status nginx
pm2 status

# Деплой
npm run deploy
```

## 📚 Документация

- **NGINX_AUDIT.md** - Полный аудит nginx конфигурации
- **TROUBLESHOOTING.md** - Решение всех возможных проблем
- **SETUP.md** - Инструкция по настройке
- **README.md** - Общая документация

## ✅ Проверка работы

```bash
# 1. Frontend
curl -I https://vapekhv.live/
# Ожидается: HTTP/2 200

# 2. API health check
curl https://vapekhv.live/health
# Ожидается: {"status":"ok","timestamp":"..."}

# 3. Telegram Bot
# Откройте бота и отправьте /start
# Должна появиться инлайн кнопка "🛍️ Открыть магазин"

# 4. Web App
# Нажмите кнопку в боте
# Должна открыться страница авторизации
```

## 🎉 Результат

Все проблемы исправлены! Сайт работает корректно:

- ✅ Нет ошибки 403
- ✅ HTTPS работает
- ✅ Frontend загружается
- ✅ Backend отвечает
- ✅ Telegram бот работает
- ✅ Автоматический деплой настроен

---

**Исправлено:** 17 октября 2025, 04:12 UTC
**Статус:** 🟢 Все системы работают нормально

