-- CreateTable
CREATE TABLE "CardEvent" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "reason" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryRestriction" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER,

    CONSTRAINT "CategoryRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardEvent_cardId_createdAt_idx" ON "CardEvent"("cardId", "createdAt");

-- CreateIndex
CREATE INDEX "CategoryRestriction_childId_idx" ON "CategoryRestriction"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRestriction_childId_categoryId_key" ON "CategoryRestriction"("childId", "categoryId");

-- AddForeignKey
ALTER TABLE "CardEvent" ADD CONSTRAINT "CardEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
