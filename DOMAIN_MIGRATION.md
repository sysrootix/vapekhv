# 🔄 Миграция домена: vapekhv.ru → vapekhv.ru

## 📋 Обзор

Домен `vapekhv.ru` был заблокирован Public Domain Registry. Выполняем миграцию на новый домен `vapekhv.ru`.

## ✅ Чеклист миграции

### 1. Подготовка DNS записей

Убедитесь, что DNS записи для `vapekhv.ru` настроены и указывают на ваш сервер:

```bash
# Проверка DNS
dig vapekhv.ru
dig www.vapekhv.ru
```

Должны быть A-записи, указывающие на IP вашего сервера.

### 2. Получение SSL сертификата

#### Установка certbot (если еще не установлен):
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

#### Получение сертификата для нового домена:
```bash
# Остановите nginx временно (если нужно)
sudo systemctl stop nginx

# Получите сертификат
sudo certbot certonly --standalone -d vapekhv.ru -d www.vapekhv.ru

# Или если nginx работает, используйте:
sudo certbot certonly --nginx -d vapekhv.ru -d www.vapekhv.ru
```

#### Проверка сертификата:
```bash
sudo certbot certificates
```

### 3. Обновление Nginx конфигурации

Создайте новый конфиг или обновите существующий:

```bash
sudo nano /etc/nginx/sites-available/vapekhv.conf
```

Используйте конфигурацию из файла `nginx/vapekhv.ru.conf` в репозитории.

Проверьте конфигурацию:
```bash
sudo nginx -t
```

Активируйте конфигурацию:
```bash
sudo ln -sf /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-enabled/vapekhv.conf
sudo systemctl reload nginx
```

### 4. Обновление переменных окружения Backend

Обновите файл `/root/shop/backend/.env`:

```env
# Старый домен (закомментировать или удалить)
# FRONTEND_URL=https://vapekhv.ru
# DOMAIN=vapekhv.ru
# WEBAPP_URL=https://vapekhv.ru

# Новый домен
FRONTEND_URL=https://vapekhv.ru
DOMAIN=vapekhv.ru
WEBAPP_URL=https://vapekhv.ru
```

### 5. Обновление переменных окружения Frontend

Создайте или обновите файл `/root/shop/frontend/.env`:

```env
VITE_API_URL=https://vapekhv.ru/api
```

### 6. Пересборка и деплой

```bash
cd /root/shop

# Пересборка фронтенда с новым API URL
cd frontend
npm run build
cd ..

# Пересборка бэкенда
cd backend
npm run build
cd ..

# Деплой
./scripts/deploy.sh
```

### 7. Перезапуск сервисов

```bash
# Перезапуск PM2
pm2 restart vapekhv-backend

# Перезагрузка Nginx
sudo systemctl reload nginx
```

### 8. Обновление Telegram Bot

В настройках Telegram Bot (@BotFather) обновите Web App URL:

1. Откройте @BotFather в Telegram
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Menu Button"
5. Установите URL: `https://vapekhv.ru`

Или через API:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://vapekhv.ru/api/webhook"
```

### 9. Проверка работоспособности

```bash
# Проверка здоровья API
curl https://vapekhv.ru/api/health

# Проверка фронтенда
curl -I https://vapekhv.ru

# Проверка SSL
openssl s_client -connect vapekhv.ru:443 -servername vapekhv.ru
```

### 10. Обновление документации

Обновите все упоминания старого домена в документации (если нужно).

## 🔄 Автоматическое обновление SSL сертификата

Настройте автообновление сертификатов:

```bash
# Проверка автообновления
sudo certbot renew --dry-run

# Добавьте в crontab (если нужно)
sudo crontab -e
# Добавьте строку:
0 0 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

## ⚠️ Важные замечания

1. **Время простоя**: Миграция может вызвать кратковременный простой. Рекомендуется выполнять в нерабочее время.

2. **Кэш браузеров**: Пользователям может потребоваться очистить кэш браузера или перезапустить Telegram Web App.

3. **Старый домен**: После миграции старый домен `vapekhv.ru` перестанет работать. Убедитесь, что все ссылки обновлены на `vapekhv.ru`.

4. **Резервное копирование**: Перед миграцией создайте резервную копию конфигураций:
   ```bash
   sudo cp /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-available/vapekhv.conf.backup
   ```

## 📝 Откат (если что-то пошло не так)

Если нужно вернуться к старому домену:

1. Восстановите старую конфигурацию Nginx
2. Обновите переменные окружения обратно на старый домен
3. Пересоберите и перезапустите сервисы

## ✅ Проверочный список после миграции

- [ ] DNS записи настроены и резолвятся
- [ ] SSL сертификат получен и работает
- [ ] Nginx конфигурация обновлена и перезагружена
- [ ] Backend .env обновлен
- [ ] Frontend .env обновлен
- [ ] Проект пересобран
- [ ] Сервисы перезапущены
- [ ] Telegram Bot Web App URL обновлен
- [ ] API отвечает на новом домене
- [ ] Frontend открывается на новом домене
- [ ] SSL сертификат валиден


