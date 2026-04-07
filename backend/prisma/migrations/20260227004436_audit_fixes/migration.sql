/*
  Warnings:

  - You are about to drop the `Reversal` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ACCOUNT';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "public"."Reversal";

-- CreateIndex
CREATE INDEX "Shift_kioskId_idx" ON "Shift"("kioskId");

-- CreateIndex
CREATE INDEX "Transaction_cashierId_idx" ON "Transaction"("cashierId");

-- CreateIndex
CREATE INDEX "Transaction_terminalId_idx" ON "Transaction"("terminalId");

-- CreateIndex
CREATE INDEX "Transaction_startedAt_idx" ON "Transaction"("startedAt");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_kioskId_fkey" FOREIGN KEY ("kioskId") REFERENCES "Kiosk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
