-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "createdBy" INTEGER,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
