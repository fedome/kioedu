-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "invoiceCae" TEXT,
ADD COLUMN     "invoiceCaeExpiry" TIMESTAMP(3),
ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" INTEGER,
ADD COLUMN     "invoiceType" INTEGER;

-- CreateTable
CREATE TABLE "InvoicingConfig" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cuit" TEXT,
    "fiscalCondition" TEXT NOT NULL DEFAULT 'MONOTRIBUTO',
    "invoiceType" INTEGER NOT NULL DEFAULT 11,
    "salePoint" INTEGER,
    "certPath" TEXT,
    "keyPath" TEXT,
    "autoInvoice" BOOLEAN NOT NULL DEFAULT false,
    "minAmountCents" INTEGER NOT NULL DEFAULT 0,
    "environment" TEXT NOT NULL DEFAULT 'testing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoicingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoicingConfig_schoolId_key" ON "InvoicingConfig"("schoolId");

-- AddForeignKey
ALTER TABLE "InvoicingConfig" ADD CONSTRAINT "InvoicingConfig_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
