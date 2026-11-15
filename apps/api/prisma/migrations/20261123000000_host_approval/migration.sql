-- Presenters need approval: existing registered users keep working, new accounts must ask.
ALTER TABLE "User" ADD COLUMN "canHost" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "hostRequestedAt" TIMESTAMP(3);
UPDATE "User" SET "canHost" = true WHERE "isGuest" = false;
