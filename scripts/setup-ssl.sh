#!/bin/bash

# Скрипт для получения SSL сертификатов для vapekhv.ru
# Использование: sudo ./scripts/setup-ssl.sh

set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN="vapekhv.ru"
WWW_DOMAIN="www.vapekhv.ru"

echo -e "${BLUE}🔐 Настройка SSL сертификатов для ${DOMAIN}${NC}"
echo ""

# Проверка прав root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Этот скрипт должен быть запущен с правами root (sudo)${NC}"
    exit 1
fi

# Шаг 1: Проверка DNS
echo -e "${BLUE}📡 Шаг 1: Проверка DNS записей...${NC}"
if command -v dig &> /dev/null; then
    echo "Проверяем резолвинг домена..."
    dig +short $DOMAIN || echo -e "${YELLOW}⚠️  DNS запись для $DOMAIN не найдена${NC}"
    dig +short $WWW_DOMAIN || echo -e "${YELLOW}⚠️  DNS запись для $WWW_DOMAIN не найдена${NC}"
else
    echo -e "${YELLOW}⚠️  dig не установлен, пропускаем проверку DNS${NC}"
fi
echo ""

# Шаг 2: Установка certbot
echo -e "${BLUE}📦 Шаг 2: Проверка установки certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    echo "Устанавливаем certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot установлен${NC}"
else
    echo -e "${GREEN}✅ Certbot уже установлен${NC}"
fi
echo ""

# Шаг 3: Создание директории для ACME challenge
echo -e "${BLUE}📁 Шаг 3: Создание директории для ACME challenge...${NC}"
mkdir -p /var/www/certbot
chmod 755 /var/www/certbot
echo -e "${GREEN}✅ Директория создана${NC}"
echo ""

# Шаг 4: Копирование nginx конфигурации
echo -e "${BLUE}⚙️  Шаг 4: Настройка Nginx конфигурации...${NC}"
if [ -f "/root/shop/nginx/vapekhv.ru.conf" ]; then
    cp /root/shop/nginx/vapekhv.ru.conf /etc/nginx/sites-available/vapekhv.conf
    echo -e "${GREEN}✅ Конфигурация скопирована${NC}"
    
    # Проверка конфигурации
    if nginx -t 2>/dev/null; then
        echo -e "${GREEN}✅ Конфигурация Nginx валидна${NC}"
    else
        echo -e "${YELLOW}⚠️  Конфигурация Nginx имеет ошибки, но продолжаем...${NC}"
    fi
    
    # Активация конфигурации
    ln -sf /etc/nginx/sites-available/vapekhv.conf /etc/nginx/sites-enabled/vapekhv.conf
    echo -e "${GREEN}✅ Конфигурация активирована${NC}"
else
    echo -e "${RED}❌ Файл /root/shop/nginx/vapekhv.ru.conf не найден${NC}"
    exit 1
fi
echo ""

# Шаг 5: Перезапуск Nginx
echo -e "${BLUE}🔄 Шаг 5: Перезапуск Nginx...${NC}"
systemctl reload nginx || systemctl restart nginx
echo -e "${GREEN}✅ Nginx перезапущен${NC}"
echo ""

# Шаг 6: Получение SSL сертификата
echo -e "${BLUE}🔐 Шаг 6: Получение SSL сертификата...${NC}"
echo "Используем метод --nginx для автоматической настройки..."
echo ""

certbot certonly --nginx \
    -d $DOMAIN \
    -d $WWW_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    --redirect || {
    
    echo -e "${YELLOW}⚠️  Автоматическое получение не удалось, пробуем standalone режим...${NC}"
    echo "Остановим Nginx временно..."
    systemctl stop nginx
    
    certbot certonly --standalone \
        -d $DOMAIN \
        -d $WWW_DOMAIN \
        --non-interactive \
        --agree-tos \
        --email admin@$DOMAIN || {
        echo -e "${RED}❌ Не удалось получить сертификат${NC}"
        echo "Запускаем Nginx обратно..."
        systemctl start nginx
        exit 1
    }
    
    echo "Запускаем Nginx обратно..."
    systemctl start nginx
}

echo ""
echo -e "${GREEN}✅ SSL сертификат получен успешно!${NC}"
echo ""

# Шаг 7: Проверка сертификата
echo -e "${BLUE}✅ Шаг 7: Проверка сертификата...${NC}"
certbot certificates
echo ""

# Шаг 8: Настройка автообновления
echo -e "${BLUE}🔄 Шаг 8: Настройка автообновления сертификатов...${NC}"
certbot renew --dry-run
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Автообновление настроено корректно${NC}"
else
    echo -e "${YELLOW}⚠️  Проблемы с автообновлением, но это не критично${NC}"
fi
echo ""

# Шаг 9: Финальная проверка Nginx
echo -e "${BLUE}🔍 Шаг 9: Финальная проверка конфигурации Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Конфигурация Nginx валидна${NC}"
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx перезагружен${NC}"
else
    echo -e "${RED}❌ Ошибка в конфигурации Nginx!${NC}"
    exit 1
fi
echo ""

echo -e "${GREEN}🎉 SSL сертификаты успешно настроены!${NC}"
echo ""
echo -e "${BLUE}📋 Следующие шаги:${NC}"
echo "1. Обновите переменные окружения в backend/.env и frontend/.env"
echo "2. Пересоберите и перезапустите приложение"
echo "3. Обновите Web App URL в Telegram Bot (@BotFather)"
echo ""
echo -e "${BLUE}🔗 Проверка:${NC}"
echo "  curl https://$DOMAIN/api/health"
echo "  curl -I https://$DOMAIN"
echo "  openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
echo ""





