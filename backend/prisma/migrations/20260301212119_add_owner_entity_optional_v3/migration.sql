/*
  Warnings:

  - A unique constraint covering the columns `[childId,ownerId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,ownerId]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode,ownerId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku,ownerId]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Account_childId_key";

-- DropIndex
DROP INDEX "public"."Category_name_key";

-- DropIndex
DROP INDEX "public"."Product_barcode_key";

-- DropIndex
DROP INDEX "public"."Product_sku_key";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "ownerId" INTEGER;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "ownerId" INTEGER;

-- AlterTable
ALTER TABLE "Kiosk" ADD COLUMN     "ownerId" INTEGER;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "ownerId" INTEGER;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "ownerId" INTEGER;

-- CreateTable
CREATE TABLE "Owner" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Owner_schoolId_idx" ON "Owner"("schoolId");

-- CreateIndex
CREATE INDEX "Account_ownerId_idx" ON "Account"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_childId_ownerId_key" ON "Account"("childId", "ownerId");

-- CreateIndex
CREATE INDEX "Category_ownerId_idx" ON "Category"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_ownerId_key" ON "Category"("name", "ownerId");

-- CreateIndex
CREATE INDEX "Kiosk_ownerId_idx" ON "Kiosk"("ownerId");

-- CreateIndex
CREATE INDEX "Product_ownerId_idx" ON "Product"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_ownerId_key" ON "Product"("barcode", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_ownerId_key" ON "Product"("sku", "ownerId");

-- CreateIndex
CREATE INDEX "Supplier_ownerId_idx" ON "Supplier"("ownerId");

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kiosk" ADD CONSTRAINT "Kiosk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
