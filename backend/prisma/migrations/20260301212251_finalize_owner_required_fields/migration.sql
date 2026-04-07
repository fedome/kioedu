/*
  Warnings:

  - Made the column `ownerId` on table `Account` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Category` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Kiosk` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Product` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ownerId` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Kiosk" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "ownerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "ownerId" SET NOT NULL;
