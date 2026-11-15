ALTER TYPE "QuestionType" ADD VALUE 'OPEN';

CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "gradeeKey" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "graderKey" TEXT,
    "verdict" BOOLEAN,
    "source" TEXT NOT NULL DEFAULT 'PEER',
    "gradedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Grade_questionId_gradeeKey_key" ON "Grade"("questionId", "gradeeKey");
CREATE INDEX "Grade_quizId_idx" ON "Grade"("quizId");
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
