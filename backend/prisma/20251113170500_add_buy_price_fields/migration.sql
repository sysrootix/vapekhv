-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "buyPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "buyPrice" DOUBLE PRECISION;

