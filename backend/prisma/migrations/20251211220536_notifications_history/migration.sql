/*
  Warnings:

  - Changed the type of `platform` on the `DevicePushToken` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('MOVEMENT', 'LOW_BALANCE', 'LIMIT_REACHED', 'NEWS');

-- AlterTable
ALTER TABLE "DevicePushToken" DROP COLUMN "platform",
ADD COLUMN     "platform" "PushPlatform" NOT NULL;

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
