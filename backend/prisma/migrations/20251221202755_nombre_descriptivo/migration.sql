/*
  Warnings:

  - You are about to drop the column `stockQuantity` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stockQuantity",
ADD COLUMN     "minStockLevel" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductBatch_productId_expirationDate_idx" ON "ProductBatch"("productId", "expirationDate");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
