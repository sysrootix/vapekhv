-- CreateEnum
CREATE TYPE "BonusTransactionType" AS ENUM ('EARNED', 'SPENT', 'GIFT', 'EXPIRED', 'REFUND');

-- DropIndex
DROP INDEX "cart_items_userId_productId_key";

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "selectedOptions" JSONB;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "selectedOptions" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bonusEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bonusUsed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bonusPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstOrderDiscount" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "bonus_transactions" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "BonusTransactionType" NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_characteristics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "values" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_characteristics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "sku" TEXT,
    "price" DOUBLE PRECISION,
    "oldPrice" DOUBLE PRECISION,
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "characteristics" JSONB NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bonus_transactions_userId_idx" ON "bonus_transactions"("userId");

-- CreateIndex
CREATE INDEX "bonus_transactions_createdAt_idx" ON "bonus_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "product_characteristics_productId_idx" ON "product_characteristics"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- CreateIndex
CREATE INDEX "cart_items_productId_idx" ON "cart_items"("productId");

-- AddForeignKey
ALTER TABLE "bonus_transactions" ADD CONSTRAINT "bonus_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_characteristics" ADD CONSTRAINT "product_characteristics_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
