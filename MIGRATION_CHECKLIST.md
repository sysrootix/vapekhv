# ✅ Чеклист миграции домена vapekhv.ru → vapekhv.ru

## 📋 Подготовка

- [ ] DNS записи для `vapekhv.ru` и `www.vapekhv.ru` настроены и указывают на IP сервера
- [ ] Проверено резолвится ли домен: `dig vapekhv.ru` и `dig www.vapekhv.ru`

## 🔐 SSL Сертификат

- [ ] Certbot установлен: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] Получен SSL сертификат: `sudo certbot certonly --nginx -d vapekhv.ru -d www.vapekhv.ru`
- [ ] Проверен сертификат: `sudo certbot certificates`
- [ ] Настроено автообновление: `sudo certbot renew --dry-run`

## ⚙️ Nginx Конфигурация

- [ ] Скопирована новая конфигурация: `sudo cp nginx/vapekhv.ru.conf /etc/nginx/sites-available/vapekhv.conf`
- [ ] Проверена конфигурация: `sudo nginx -t`
- [ ] Активирована конфигурация: `sudo ln -sf /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-enabled/vapekhv.conf`
- [ ] Перезагружен Nginx: `sudo systemctl reload nginx`

## 🔧 Backend Конфигурация

- [ ] Обновлен `/root/shop/backend/.env`:
  - [ ] `DOMAIN=vapekhv.ru`
  - [ ] `FRONTEND_URL=https://vapekhv.ru`
  - [ ] `WEBAPP_URL=https://vapekhv.ru`
- [ ] Пересобран backend: `cd backend && npm run build`
- [ ] Перезапущен PM2: `pm2 restart vapekhv-backend`

## 🎨 Frontend Конфигурация

- [ ] Создан/обновлен `/root/shop/frontend/.env`:
  - [ ] `VITE_API_URL=https://vapekhv.ru/api`
- [ ] Пересобран frontend: `cd frontend && npm run build`
- [ ] Задеплоен frontend: `sudo cp -r frontend/dist/* /var/www/vapekhv/`

## 🤖 Telegram Bot

- [ ] Обновлен Web App URL в @BotFather:
  - [ ] Открыть @BotFather → `/mybots` → выбрать бота
  - [ ] Bot Settings → Menu Button → установить `https://vapekhv.ru`
- [ ] Или через API (если используется webhook)

## ✅ Проверка

- [ ] API отвечает: `curl https://vapekhv.ru/api/health`
- [ ] Frontend открывается: `curl -I https://vapekhv.ru`
- [ ] SSL валиден: `openssl s_client -connect vapekhv.ru:443 -servername vapekhv.ru`
- [ ] Статические файлы доступны: `curl -I https://vapekhv.ru/uploads/products/test.jpg` (если есть)
- [ ] Telegram Web App открывается в боте

## 📝 Документация

- [ ] Обновлены все скрипты деплоя
- [ ] Обновлена документация (CLAUDE.md, GEMINI.md, DEPLOY.md)
- [ ] Создана резервная копия старой конфигурации

## 🔄 Откат (если нужно)

Если что-то пошло не так, можно откатиться:

1. Восстановить старую конфигурацию Nginx
2. Обновить переменные окружения обратно на старый домен
3. Пересобрать и перезапустить сервисы

## 📞 Контакты для поддержки

Если возникли проблемы, проверьте:
- Логи Nginx: `sudo tail -f /var/log/nginx/vapekhv_error.log`
- Логи Backend: `pm2 logs vapekhv-backend`
- Статус PM2: `pm2 status`

