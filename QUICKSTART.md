# ⚡ Быстрый старт за 5 минут

## 1️⃣ Установка (1 мин)

```bash
cd /root/shop
./scripts/setup.sh
```

## 2️⃣ Создать Telegram бота (2 мин)

1. Откройте **@BotFather** в Telegram
2. Отправьте: `/newbot`
3. Укажите имя: `VapeKHV Bot`
4. Укажите username: `vapekhv_bot`
5. **Скопируйте токен**

## 3️⃣ Настроить базу данных (1 мин)

Откройте `backend/.env` и замените:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/vapekhv_db?schema=public"
TELEGRAM_BOT_TOKEN=PASTE_YOUR_TOKEN_HERE
```

Затем запустите:

```bash
./scripts/init-db.sh
```

## 4️⃣ Запустить (30 сек)

```bash
npm run dev
```

Готово! 🎉

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## 5️⃣ Настроить Web App в Telegram (30 сек)

1. В @BotFather отправьте: `/newapp`
2. Выберите вашего бота
3. Укажите URL: `https://vapekhv.live` (или ваш локальный URL для разработки)
4. Нажмите на Web App в боте

---

## 🚀 Production деплой

```bash
# 1. Собрать
npm run build

# 2. Запустить с PM2
npm start

# 3. Проверить
pm2 status
pm2 logs
```

---

## 📱 Тестирование в Telegram

### Development (локально)

Для тестирования локально используйте ngrok:

```bash
# Установить ngrok
npm install -g ngrok

# Запустить туннель
ngrok http 5173

# Скопировать HTTPS URL (например: https://abc123.ngrok.io)
# Указать этот URL в @BotFather -> /newapp
```

### Production

1. Настройте SSL для домена vapekhv.live
2. Укажите `https://vapekhv.live` в @BotFather
3. Откройте бота в Telegram
4. Нажмите на Web App

---

## 🔧 Частые проблемы

### Ошибка подключения к БД

```bash
# Запустить PostgreSQL
sudo systemctl start postgresql

# Проверить статус
sudo systemctl status postgresql
```

### Port already in use

```bash
# Найти процесс
lsof -i :3000

# Убить процесс
kill -9 <PID>
```

### Telegram Web App не открывается

- Убедитесь что используете HTTPS (или ngrok для dev)
- Проверьте URL в @BotFather
- Проверьте TELEGRAM_BOT_TOKEN в .env

---

## 📚 Подробная документация

- **README.md** - полная документация
- **SETUP.md** - детальная инструкция по настройке
- **CONTRIBUTING.md** - руководство для разработчиков

---

## ✅ Что дальше?

После успешного запуска вы можете:

1. 🎨 Настроить дизайн в `frontend/src/`
2. 🔧 Добавить новые API endpoints в `backend/src/`
3. 🗄️ Изменить схему БД в `backend/prisma/schema.prisma`
4. 📦 Добавить новые фичи (корзина, каталог, оплата)

Удачи! 🚀

