ALTER TABLE "Quiz" ADD COLUMN "finishedAt" TIMESTAMP(3);
-- Quizzes that already ended: start their retention clock from creation (best available date).
UPDATE "Quiz" SET "finishedAt" = "createdAt" WHERE "status" IN ('FINISHED', 'ARCHIVED');
