-- Chat between players and the presenter during a quiz.
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromHost" BOOLEAN NOT NULL DEFAULT false,
    "toUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatMessage_quizId_createdAt_idx" ON "ChatMessage"("quizId", "createdAt");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
