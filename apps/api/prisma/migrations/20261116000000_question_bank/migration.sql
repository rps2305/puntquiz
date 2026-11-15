ALTER TABLE "Question" ADD COLUMN "bankQuestionId" TEXT;

CREATE TABLE "BankQuestion" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'MC',
    "options" JSONB NOT NULL,
    "correct" JSONB NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "seconds" INTEGER NOT NULL DEFAULT 30,
    "explanation" TEXT,
    "category" TEXT,
    "difficulty" INTEGER,
    "tags" TEXT[],
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankQuestion_ownerId_idx" ON "BankQuestion"("ownerId");
CREATE INDEX "Question_bankQuestionId_idx" ON "Question"("bankQuestionId");
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_bankQuestionId_fkey" FOREIGN KEY ("bankQuestionId") REFERENCES "BankQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
