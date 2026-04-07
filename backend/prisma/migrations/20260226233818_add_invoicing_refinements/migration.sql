-- AlterTable
ALTER TABLE "InvoicingConfig" ADD COLUMN     "businessLogo" TEXT,
ADD COLUMN     "lastError" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "invoiceError" TEXT;
