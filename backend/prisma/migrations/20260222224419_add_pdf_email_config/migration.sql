-- AlterTable
ALTER TABLE "InvoicingConfig" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "pdfSavePath" TEXT,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPass" TEXT,
ADD COLUMN     "smtpPort" INTEGER,
ADD COLUMN     "smtpUser" TEXT;
