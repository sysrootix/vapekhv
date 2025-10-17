# 🔧 Настройка GitHub Workflow

Это руководство поможет настроить удобный workflow для разработки на MacBook с последующим деплоем на сервер.

## 📋 Оглавление
1. [Инициализация Git репозитория](#инициализация-git-репозитория)
2. [Создание GitHub репозитория](#создание-github-репозитория)
3. [Настройка .gitignore](#настройка-gitignore)
4. [Настройка на MacBook](#настройка-на-macbook)
5. [Настройка на сервере](#настройка-на-сервере)
6. [Workflow разработки](#workflow-разработки)
7. [Полезные Git команды](#полезные-git-команды)

---

## 1️⃣ Инициализация Git репозитория

На MacBook в папке проекта:

```bash
cd /Users/sysrootix/Desktop/work/shop

# Инициализация Git (если еще не сделано)
git init

# Проверка статуса
git status
```

---

## 2️⃣ Создание GitHub репозитория

### Вариант A: Через веб-интерфейс GitHub

1. Зайди на https://github.com
2. Нажми "New repository"
3. Назови репозиторий (например, `vapekhv-shop`)
4. Выбери **Private** (чтобы скрыть код)
5. **НЕ создавай** README, .gitignore, license (у нас уже есть код)
6. Нажми "Create repository"

### Вариант B: Через GitHub CLI

```bash
# Установи GitHub CLI (если не установлен)
brew install gh

# Авторизация
gh auth login

# Создание приватного репозитория
gh repo create vapekhv-shop --private --source=. --remote=origin
```

---

## 3️⃣ Настройка .gitignore

Создай файл `.gitignore` в корне проекта (если его нет):

```bash
# .gitignore

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment variables
.env
.env.local
.env.production.local
.env.development.local
.env.test.local
*.env

# Build outputs
dist/
build/
frontend/dist/
backend/dist/

# Logs
logs/
*.log
backend/logs/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Testing
coverage/

# Prisma
backend/prisma/.env
backend/prisma/migrations/**/migration.sql

# PM2
.pm2/
```

**⚠️ ВАЖНО:** Убедись, что `.env` файлы добавлены в `.gitignore`, чтобы не закоммитить секреты!

---

## 4️⃣ Настройка на MacBook

### Добавление remote и первый push

```bash
# Замени YOUR_USERNAME на свой GitHub username
git remote add origin https://github.com/YOUR_USERNAME/vapekhv-shop.git

# Проверка remote
git remote -v

# Добавление всех файлов
git add .

# Первый коммит
git commit -m "Initial commit: VapeKHV Telegram Web App"

# Переименование ветки в main (если нужно)
git branch -M main

# Push в GitHub
git push -u origin main
```

### Настройка Git credentials (для удобства)

```bash
# Сохранение credentials в keychain (MacOS)
git config --global credential.helper osxkeychain

# Настройка имени и email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Альтернатива: SSH ключ (рекомендуется)

```bash
# Генерация SSH ключа
ssh-keygen -t ed25519 -C "your.email@example.com"

# Копирование публичного ключа
cat ~/.ssh/id_ed25519.pub | pbcopy

# Добавь этот ключ на GitHub:
# Settings → SSH and GPG keys → New SSH key → Вставь ключ

# Измени remote на SSH
git remote set-url origin git@github.com:YOUR_USERNAME/vapekhv-shop.git
```

---

## 5️⃣ Настройка на сервере

### Клонирование репозитория на сервер

```bash
# SSH в сервер
ssh user@your-server-ip

# Перейди в домашнюю папку
cd ~

# Если у тебя уже есть папка shop - переименуй ее (backup)
mv shop shop_backup_$(date +%Y%m%d)

# Клонирование репозитория
git clone https://github.com/YOUR_USERNAME/vapekhv-shop.git shop

cd shop
```

### Настройка credentials на сервере

**Вариант A: HTTPS с Personal Access Token**

```bash
# Создай Personal Access Token на GitHub:
# Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token
# Выбери scope: repo

# При git pull в первый раз введи:
# Username: твой GitHub username
# Password: сгенерированный токен (НЕ пароль от GitHub!)

# Сохранение credentials
git config --global credential.helper store
git pull  # Введи credentials один раз - они сохранятся
```

**Вариант B: SSH ключ (рекомендуется)**

```bash
# На сервере сгенерируй SSH ключ
ssh-keygen -t ed25519 -C "server@vapekhv.live"

# Скопируй публичный ключ
cat ~/.ssh/id_ed25519.pub

# Добавь ключ на GitHub (Settings → SSH and GPG keys)

# Измени remote на SSH
cd ~/shop
git remote set-url origin git@github.com:YOUR_USERNAME/vapekhv-shop.git

# Тест
git pull
```

### Настройка .env файлов на сервере

```bash
cd ~/shop

# Frontend .env
cat > frontend/.env << 'EOF'
VITE_API_URL=https://vapekhv.live/api
VITE_APP_NAME=VapeKHV
EOF

# Backend .env
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
DOMAIN=vapekhv.live
DATABASE_URL="postgresql://user:password@localhost:5432/vapekhv_db?schema=public"
TELEGRAM_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://vapekhv.live
EOF

# Измени значения в backend/.env на настоящие!
nano backend/.env
```

### Настройка скрипта деплоя

```bash
# Сделай скрипт исполняемым
chmod +x deploy.sh

# Проверь конфигурацию в deploy.sh
nano deploy.sh

# Измени переменные если нужно:
# FRONTEND_DEST="/var/www/vapekhv"
# PM2_APP_NAME="vapekhv-backend"
```

---

## 6️⃣ Workflow разработки

### На MacBook (разработка)

```bash
# 1. Внеси изменения в код
# 2. Проверь статус
git status

# 3. Добавь измененные файлы
git add .

# 4. Коммит с понятным сообщением
git commit -m "feat: add product placeholder component"

# 5. Push в GitHub
git push origin main
```

### На сервере (деплой)

```bash
# SSH в сервер
ssh user@your-server-ip

# Перейди в папку проекта
cd ~/shop

# Запусти скрипт деплоя - он сделает все автоматически!
./deploy.sh
```

**Скрипт `deploy.sh` автоматически:**
1. ✅ Подтянет последние изменения (`git pull`)
2. ✅ Установит зависимости (`npm install`)
3. ✅ Соберет проект (`npm run build`)
4. ✅ Скопирует frontend в `/var/www/vapekhv/`
5. ✅ Перезагрузит Nginx
6. ✅ Перезапустит backend через PM2

---

## 7️⃣ Полезные Git команды

### Проверка статуса и истории

```bash
# Статус файлов
git status

# История коммитов
git log --oneline

# История последних 5 коммитов
git log --oneline -5

# Посмотреть изменения
git diff
```

### Работа с ветками (опционально)

```bash
# Создать ветку для фичи
git checkout -b feature/new-feature

# Переключиться на main
git checkout main

# Слияние ветки
git merge feature/new-feature

# Удаление ветки
git branch -d feature/new-feature
```

### Откат изменений

```bash
# Откатить изменения в файле (до коммита)
git checkout -- filename.ts

# Откатить последний коммит (но оставить изменения)
git reset --soft HEAD~1

# Откатить последний коммит (и удалить изменения) ⚠️
git reset --hard HEAD~1
```

### Синхронизация

```bash
# Подтянуть изменения с GitHub
git pull origin main

# Отправить изменения на GitHub
git push origin main

# Force push (используй осторожно!) ⚠️
git push -f origin main
```

---

## 🎯 Быстрый чек-лист для ежедневной работы

### MacBook:
```bash
# Проверка изменений
git status

# Добавление, коммит, push
git add .
git commit -m "feat: описание изменений"
git push origin main
```

### Сервер:
```bash
# SSH в сервер
ssh user@your-server-ip

# Деплой одной командой
cd ~/shop && ./deploy.sh
```

---

## 🔐 Безопасность

✅ **DO:**
- Используй `.gitignore` для `.env` файлов
- Используй SSH ключи вместо паролей
- Создай приватный репозиторий для коммерческих проектов
- Используй Personal Access Tokens (не пароли) для HTTPS

❌ **DON'T:**
- НЕ коммить `.env` файлы с секретами
- НЕ коммить `node_modules/`
- НЕ использовать `git push -f` на main ветке в продакшене
- НЕ коммить credentials, API keys, пароли БД

---

## 📞 Troubleshooting

### Проблема: "Permission denied (publickey)"

**Решение:** Настрой SSH ключ (см. раздел 4 и 5)

### Проблема: "fatal: remote origin already exists"

```bash
# Удали старый remote
git remote remove origin

# Добавь новый
git remote add origin https://github.com/YOUR_USERNAME/vapekhv-shop.git
```

### Проблема: Merge conflicts

```bash
# Посмотри конфликтующие файлы
git status

# Открой файлы, исправь конфликты
# Найди маркеры <<<<<<, ======, >>>>>>

# После исправления
git add .
git commit -m "fix: resolve merge conflicts"
```

### Проблема: deploy.sh не запускается

```bash
# Сделай скрипт исполняемым
chmod +x deploy.sh

# Проверь что используешь bash (не sh)
bash deploy.sh
```

---

## 🚀 Готово!

Теперь у тебя настроен удобный workflow:
1. ✅ Пиши код на MacBook
2. ✅ Коммить и пуш в GitHub
3. ✅ Деплой на сервер одной командой: `./deploy.sh`

**Удачи в разработке! 🎉**
