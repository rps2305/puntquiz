ALTER TABLE "Quiz" ADD COLUMN "powerUps" JSONB;
ALTER TABLE "Question" ADD COLUMN "hint" TEXT;
ALTER TABLE "BankQuestion" ADD COLUMN "hint" TEXT;

CREATE TABLE "PowerUpUse" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PowerUpUse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PowerUpUse_ownerKey_questionId_type_key" ON "PowerUpUse"("ownerKey", "questionId", "type");
CREATE INDEX "PowerUpUse_quizId_idx" ON "PowerUpUse"("quizId");
