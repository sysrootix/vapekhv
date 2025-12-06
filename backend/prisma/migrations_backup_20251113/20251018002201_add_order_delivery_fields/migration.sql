-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryDate" TEXT,
ADD COLUMN     "deliveryTime" TEXT;
