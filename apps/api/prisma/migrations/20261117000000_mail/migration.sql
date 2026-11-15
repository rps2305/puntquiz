ALTER TABLE "Participation" ADD COLUMN "emailResults" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MailLog_userId_kind_key_key" ON "MailLog"("userId", "kind", "key");
CREATE INDEX "MailLog_createdAt_idx" ON "MailLog"("createdAt");
