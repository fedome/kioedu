/*
  Warnings:

  - Added the required column `unitCostCents` to the `ProductBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductBatch" ADD COLUMN     "unitCostCents" INTEGER NOT NULL;
