-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'VOID';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'TOPUP';

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "kioskId" INTEGER,
    "userId" INTEGER,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
