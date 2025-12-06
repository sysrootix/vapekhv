-- CreateTable
CREATE TABLE IF NOT EXISTS "product_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_views_userId_productId_key" ON "product_views"("userId", "productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_views_userId_viewedAt_idx" ON "product_views"("userId", "viewedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_views_productId_idx" ON "product_views"("productId");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_views_userId_fkey'
    ) THEN
        ALTER TABLE "product_views" ADD CONSTRAINT "product_views_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'product_views_productId_fkey'
    ) THEN
        ALTER TABLE "product_views" ADD CONSTRAINT "product_views_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

