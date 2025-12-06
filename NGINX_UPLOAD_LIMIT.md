# Инструкция по увеличению лимита размера запроса в Nginx

## Проблема
При отправке отзывов с изображениями/видео возникает ошибка "request entity too large", 
так как размер запроса превышает лимит по умолчанию (100 КБ).

## Решение

### 1. Откройте конфигурацию Nginx:
```bash
sudo nano /etc/nginx/sites-available/vapekhv
```

### 2. Найдите блок `server` и добавьте/измените директиву `client_max_body_size`:

Добавьте или измените строку:
```nginx
server {
    listen 443 ssl http2;
    server_name vapekhv.ru;
    
    # Увеличиваем лимит размера тела запроса до 50 МБ
    client_max_body_size 50M;
    
    # ... остальная конфигурация
}
```

### 3. Проверьте синтаксис конфигурации:
```bash
sudo nginx -t
```

### 4. Перезагрузите Nginx:
```bash
sudo systemctl reload nginx
```

### 5. Перезапустите backend (если используется PM2):
```bash
pm2 restart vapekhv-backend
```

## Примечание
Лимит в Express уже увеличен до 50 МБ в `backend/src/index.ts`.
Теперь можно отправлять отзывы с изображениями и видео.

