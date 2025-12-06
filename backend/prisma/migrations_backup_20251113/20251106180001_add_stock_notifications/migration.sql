-- Удаляем таблицу если она существует с неправильной структурой
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_notifications') THEN
        DROP TABLE IF EXISTS "stock_notifications" CASCADE;
    END IF;
END $$;

-- Создаем таблицу заново
CREATE TABLE "stock_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "stock_notifications_pkey" PRIMARY KEY ("id")
);

-- Создаем индексы
CREATE UNIQUE INDEX "stock_notifications_userId_productId_key" ON "stock_notifications"("userId", "productId");
CREATE INDEX "stock_notifications_userId_idx" ON "stock_notifications"("userId");
CREATE INDEX "stock_notifications_productId_idx" ON "stock_notifications"("productId");
CREATE INDEX "stock_notifications_notified_idx" ON "stock_notifications"("notified");

-- Добавляем внешние ключи
ALTER TABLE "stock_notifications" ADD CONSTRAINT "stock_notifications_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_notifications" ADD CONSTRAINT "stock_notifications_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

