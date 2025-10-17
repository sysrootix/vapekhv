# 🔧 Решение проблем - VapeKHV

## ❌ Ошибка 403 Forbidden при открытии сайта

### Проблема
При открытии `https://vapekhv.live` получаете:
```
403 Forbidden
nginx/1.24.0 (Ubuntu)
```

### Причина
Nginx не может получить доступ к файлам frontend из-за:
1. Файлы находятся в `/root/shop/` (доступ только для root)
2. Директория `/root` имеет права 700 (drwx------)
3. Nginx работает от пользователя `www-data` и не может читать файлы

### ✅ Решение (уже применено)

Файлы перемещены в стандартную веб-директорию:
```bash
# Директория с файлами
/var/www/vapekhv/

# Владелец
www-data:www-data

# Права
drwxr-xr-x (755)
```

### Проверка решения
```bash
# 1. Проверить файлы
ls -la /var/www/vapekhv/

# 2. Проверить доступ
curl -I https://vapekhv.live/
# Должен вернуть: HTTP/2 200

# 3. Проверить nginx
sudo nginx -t
sudo systemctl status nginx
```

---

## ⚠️ Ошибка `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

### Проблема
В логах backend появляется:
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

### Причина
Express не доверяет заголовкам от nginx прокси-сервера.

### ✅ Решение (уже применено)

В `backend/src/index.ts` добавлена строка:
```typescript
app.set('trust proxy', 1);
```

Это позволяет Express доверять заголовкам от nginx (первый прокси-сервер).

---

## 🚫 Проблемы с SSL/HTTPS

### Ошибка: SSL certificate problem
```bash
# Проверить сертификаты
sudo certbot certificates

# Обновить сертификаты
sudo certbot renew

# Автоматическое обновление (добавить в cron)
sudo crontab -e
# Добавить: 0 3 * * * certbot renew --quiet
```

---

## 🐛 Backend не запускается

### Проверка 1: База данных
```bash
# Проверить статус PostgreSQL
sudo systemctl status postgresql

# Проверить подключение
psql -U vapekhv_user -d vapekhv_db -h localhost

# Если ошибка прав, выполнить:
sudo -u postgres psql -c "ALTER USER vapekhv_user CREATEDB;"
```

### Проверка 2: Переменные окружения
```bash
# Проверить .env файл
cat /root/shop/backend/.env

# Должны быть:
# DATABASE_URL="postgresql://..."
# TELEGRAM_BOT_TOKEN=...
# JWT_SECRET=...
```

### Проверка 3: Миграции
```bash
cd /root/shop/backend
npx prisma migrate dev
npx prisma generate
```

---

## 🤖 Telegram бот не отвечает

### Проверка 1: Токен бота
```bash
# Проверить переменную окружения
grep TELEGRAM_BOT_TOKEN /root/shop/backend/.env

# Проверить токен через API
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

### Проверка 2: Webhook vs Polling
```bash
# Удалить webhook (если был установлен)
curl https://api.telegram.org/bot<YOUR_TOKEN>/deleteWebhook

# Проверить статус
curl https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo
```

### Проверка 3: Логи бота
```bash
# Проверить логи backend
pm2 logs vapekhv-backend

# Или в development
npm run dev:backend
```

---

## 📦 Ошибки при npm install

### EACCES permission denied
```bash
# Очистить npm cache
npm cache clean --force

# Переустановить зависимости
npm run reinstall
```

### Peer dependencies warnings
```bash
# Использовать legacy-peer-deps
npm install --legacy-peer-deps
```

---

## 🔄 Деплой не работает

### После изменений frontend не обновляется

**Причина:** Файлы не скопированы в `/var/www/vapekhv/`

**Решение:**
```bash
# Автоматический деплой (рекомендуется)
npm run deploy

# Или вручную
npm run build:frontend
sudo cp -r frontend/dist/* /var/www/vapekhv/
sudo systemctl reload nginx
```

### Кеш браузера

**Проблема:** Браузер показывает старую версию

**Решение:**
```bash
# Очистить кеш в браузере: Ctrl+Shift+R (или Cmd+Shift+R на Mac)

# Проверить версию файлов
curl -I https://vapekhv.live/assets/index-*.js
```

---

## 🗄️ Проблемы с базой данных

### Prisma не может создать shadow database
```bash
# Дать права пользователю
sudo -u postgres psql -c "ALTER USER vapekhv_user CREATEDB;"

# Или добавить в .env
echo "PRISMA_MIGRATE_SKIP_SHADOW_DATABASE_CHECK=1" >> backend/.env
```

### Ошибка подключения к БД
```bash
# Проверить, что PostgreSQL запущен
sudo systemctl start postgresql

# Проверить порт
sudo netstat -plnt | grep 5432

# Проверить пароль
psql "postgresql://vapekhv_user:password@localhost:5432/vapekhv_db"
```

---

## 🚀 Rate limiting слишком строгий

### 429 Too Many Requests

**Временное решение:**
```nginx
# В /etc/nginx/sites-available/vapekhv.conf
# Увеличить лимит:
limit_req zone=api_limit burst=50 nodelay;

# Перезагрузить nginx
sudo systemctl reload nginx
```

**Постоянное решение:**
```nginx
# В /etc/nginx/conf.d/rate_limit.conf
# Изменить rate с 10r/s на нужный
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
```

---

## 📊 Логи и отладка

### Где смотреть логи

```bash
# Nginx access логи
sudo tail -f /var/log/nginx/vapekhv_access.log

# Nginx error логи
sudo tail -f /var/log/nginx/vapekhv_error.log

# Backend логи (PM2)
pm2 logs vapekhv-backend

# Backend логи (development)
cd /root/shop
npm run dev:backend

# PostgreSQL логи
sudo tail -f /var/log/postgresql/postgresql-*.log

# Системные логи
journalctl -u nginx -f
journalctl -u postgresql -f
```

### Режим отладки

```bash
# Backend с подробными логами
cd /root/shop/backend
NODE_ENV=development npm run dev

# Nginx debug mode (осторожно, много логов!)
# В конфиге: error_log /var/log/nginx/error.log debug;
```

---

## 🔐 Проблемы с авторизацией

### JWT токен не валидный

```bash
# Сгенерировать новый JWT_SECRET
npm run generate-secret

# Обновить в .env
echo "JWT_SECRET=<новый_секрет>" >> backend/.env

# Перезапустить backend
pm2 restart vapekhv-backend
```

### Telegram auth не работает

**Проверить:**
1. `TELEGRAM_BOT_TOKEN` в `.env`
2. Домен в настройках бота (@BotFather → /setdomain)
3. Web App URL совпадает с реальным

---

## 🛠️ Полезные команды

### Быстрая диагностика
```bash
# Проверить все сервисы
systemctl status nginx postgresql
pm2 status

# Проверить порты
sudo netstat -tulpn | grep -E ":(80|443|3000|5432)"

# Проверить диск
df -h

# Проверить память
free -h

# Проверить процессы
top
```

### Перезапуск всего
```bash
# Перезапустить все сервисы
sudo systemctl restart nginx postgresql
pm2 restart all

# Или полный рестарт
sudo reboot
```

### Восстановление из бэкапа
```bash
# Nginx конфиг
sudo cp /etc/nginx/sites-available/vapekhv.conf.backup \
       /etc/nginx/sites-available/vapekhv.conf
sudo nginx -t && sudo systemctl reload nginx

# Frontend файлы (смотреть последние бэкапы)
ls -la /var/www/vapekhv_backup_*
sudo cp -r /var/www/vapekhv_backup_YYYYMMDD_HHMMSS/* /var/www/vapekhv/
```

---

## 📞 Получить помощь

Если проблема не решена:

1. **Собрать логи:**
```bash
# Создать отчет
{
  echo "=== Nginx Status ==="
  systemctl status nginx
  echo ""
  echo "=== Nginx Config Test ==="
  sudo nginx -t
  echo ""
  echo "=== Last Nginx Errors ==="
  sudo tail -50 /var/log/nginx/vapekhv_error.log
  echo ""
  echo "=== PM2 Status ==="
  pm2 status
  echo ""
  echo "=== Backend Logs ==="
  pm2 logs vapekhv-backend --lines 50 --nostream
} > /tmp/vapekhv_debug.log

# Отправить файл /tmp/vapekhv_debug.log
```

2. **Проверить версии:**
```bash
node --version
npm --version
nginx -v
psql --version
pm2 --version
```

3. **Проверить конфигурацию:**
```bash
cat /etc/nginx/sites-available/vapekhv.conf
cat /root/shop/backend/.env  # (скрыть пароли!)
```

---

## ✅ Чеклист здоровья системы

```bash
# Запустить проверку
cd /root/shop

# 1. Nginx
sudo nginx -t && echo "✅ Nginx OK" || echo "❌ Nginx ERROR"

# 2. PostgreSQL
sudo systemctl is-active postgresql && echo "✅ PostgreSQL OK" || echo "❌ PostgreSQL ERROR"

# 3. Backend
pm2 describe vapekhv-backend > /dev/null && echo "✅ Backend OK" || echo "❌ Backend ERROR"

# 4. Frontend файлы
[ -f /var/www/vapekhv/index.html ] && echo "✅ Frontend OK" || echo "❌ Frontend ERROR"

# 5. SSL сертификат
curl -I https://vapekhv.live 2>&1 | grep "HTTP/2 200" && echo "✅ HTTPS OK" || echo "❌ HTTPS ERROR"

# 6. API доступен
curl -s https://vapekhv.live/api/health | grep "ok" && echo "✅ API OK" || echo "❌ API ERROR"
```

Все должны показывать ✅!

---

*Последнее обновление: 17 октября 2025*

