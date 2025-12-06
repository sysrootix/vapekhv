-- CreateTable
CREATE TABLE "crm_audiences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filters" JSONB NOT NULL,
    "userCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_audiences_createdById_idx" ON "crm_audiences"("createdById");
CREATE INDEX "crm_audiences_createdAt_idx" ON "crm_audiences"("createdAt");

-- AddForeignKey
ALTER TABLE "crm_audiences" ADD CONSTRAINT "crm_audiences_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

