-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'SESSION_COMPLETED',
  'MISSION_COMPLETED',
  'BADGE_EARNED',
  'LEARNING_PLAN_READY',
  'LEARNING_PLAN_REFRESHED',
  'SYSTEM'
);

-- CreateEnum
CREATE TYPE "NotificationCtaType" AS ENUM (
  'SESSION_RESULT',
  'LEARNING_PLAN',
  'MISSIONS',
  'BADGES',
  'SCENES',
  'HOME'
);

-- CreateTable
CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "ctaType" "NotificationCtaType",
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
