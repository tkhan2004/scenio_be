ALTER TABLE "users"
ADD COLUMN "learningGoal" TEXT,
ADD COLUMN "studyFrequency" TEXT,
ADD COLUMN "selfAssessment" TEXT,
ADD COLUMN "needsLevelTest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "levelTestedAt" TIMESTAMP(3),
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
