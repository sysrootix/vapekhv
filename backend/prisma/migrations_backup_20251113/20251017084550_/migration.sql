/*
  Warnings:

  - A unique constraint covering the columns `[moySkladId]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moySkladId]` on the table `product_variants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[moySkladId]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "moySkladId" TEXT,
ADD COLUMN     "moySkladUpdated" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "moySkladId" TEXT,
ADD COLUMN     "moySkladUpdated" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "article" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "externalCode" TEXT,
ADD COLUMN     "moySkladId" TEXT,
ADD COLUMN     "moySkladUpdated" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "categories_moySkladId_key" ON "categories"("moySkladId");

-- CreateIndex
CREATE INDEX "categories_moySkladId_idx" ON "categories"("moySkladId");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_moySkladId_key" ON "product_variants"("moySkladId");

-- CreateIndex
CREATE INDEX "product_variants_moySkladId_idx" ON "product_variants"("moySkladId");

-- CreateIndex
CREATE UNIQUE INDEX "products_moySkladId_key" ON "products"("moySkladId");

-- CreateIndex
CREATE INDEX "products_moySkladId_idx" ON "products"("moySkladId");
