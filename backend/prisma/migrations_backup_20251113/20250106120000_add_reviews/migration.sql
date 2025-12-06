-- CreateTable
CREATE TABLE IF NOT EXISTS "reviews" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT,
    "bonusAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_userId_idx" ON "reviews"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_productId_idx" ON "reviews"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_orderId_idx" ON "reviews"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reviews_createdAt_idx" ON "reviews"("createdAt");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_userId_productId_key" ON "reviews"("userId", "productId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_userId_fkey'
    ) THEN
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_productId_fkey'
    ) THEN
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_productId_fkey" 
        FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_orderId_fkey'
    ) THEN
        ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" 
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

