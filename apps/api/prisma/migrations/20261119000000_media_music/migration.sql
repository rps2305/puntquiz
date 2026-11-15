ALTER TYPE "QuestionType" ADD VALUE 'MUSIC';

ALTER TABLE "Question" ADD COLUMN "media" JSONB, ADD COLUMN "config" JSONB;
ALTER TABLE "BankQuestion" ADD COLUMN "media" JSONB, ADD COLUMN "config" JSONB;

CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_ownerId_idx" ON "MediaAsset"("ownerId");
