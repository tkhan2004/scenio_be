ALTER TABLE "users"
ADD COLUMN "targetLevel" "Level",
ADD COLUMN "learningGoals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "practiceContexts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "focusSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "dailyPracticeMinutes" INTEGER,
ADD COLUMN "targetOutcome" TEXT,
ADD COLUMN "correctionPreference" TEXT;

UPDATE "users"
SET "learningGoals" = ARRAY["learningGoal"]
WHERE "learningGoal" IS NOT NULL
  AND cardinality("learningGoals") = 0;

UPDATE "users"
SET "focusSkills" = ARRAY["selfAssessment"]
WHERE "selfAssessment" IS NOT NULL
  AND cardinality("focusSkills") = 0;
