-- CreateEnum
CREATE TYPE "SessionSourceType" AS ENUM ('CURATED_SCENE', 'CUSTOM_PRACTICE');

-- CreateTable
CREATE TABLE "custom_practice_configs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "practiceGoal" TEXT NOT NULL,
  "successOutcome" TEXT,
  "topicSummary" TEXT NOT NULL,
  "contextType" TEXT NOT NULL,
  "location" TEXT,
  "conversationChannel" TEXT NOT NULL,
  "timePressure" TEXT,
  "specialConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "userRole" TEXT NOT NULL,
  "userIntent" TEXT,
  "userEnglishLevel" "Level",
  "userPersonaNotes" TEXT,
  "aiRole" TEXT NOT NULL,
  "aiDisplayName" TEXT NOT NULL,
  "aiRelationshipToUser" TEXT,
  "aiPrimaryGoal" TEXT,
  "aiBehaviorStyle" TEXT,
  "aiGenderPresentation" "VoiceGender" NOT NULL DEFAULT 'NEUTRAL',
  "aiVoicePresetId" TEXT,
  "aiVoiceTone" TEXT,
  "aiSpeechSpeed" TEXT,
  "aiAccentPreference" TEXT,
  "difficulty" "Level" NOT NULL DEFAULT 'A2',
  "conversationLength" TEXT,
  "correctionStyle" TEXT,
  "hintFrequency" TEXT,
  "responseComplexity" TEXT,
  "focusSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mustUseVocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "avoidTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "customInstructions" TEXT,
  "displayTitle" TEXT NOT NULL,
  "displaySubtitle" TEXT NOT NULL,
  "missionText" TEXT NOT NULL,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
  "openingMessage" TEXT NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "custom_practice_configs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sessions"
  ADD COLUMN "customPracticeConfigId" TEXT,
  ADD COLUMN "sourceType" "SessionSourceType" NOT NULL DEFAULT 'CURATED_SCENE';

-- AlterTable
ALTER TABLE "sessions"
  ALTER COLUMN "sceneId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "custom_practice_configs_userId_idx" ON "custom_practice_configs"("userId");

-- CreateIndex
CREATE INDEX "custom_practice_configs_aiVoicePresetId_idx" ON "custom_practice_configs"("aiVoicePresetId");

-- CreateIndex
CREATE INDEX "sessions_customPracticeConfigId_idx" ON "sessions"("customPracticeConfigId");

-- AddForeignKey
ALTER TABLE "custom_practice_configs"
  ADD CONSTRAINT "custom_practice_configs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_practice_configs"
  ADD CONSTRAINT "custom_practice_configs_aiVoicePresetId_fkey"
  FOREIGN KEY ("aiVoicePresetId") REFERENCES "voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_customPracticeConfigId_fkey"
  FOREIGN KEY ("customPracticeConfigId") REFERENCES "custom_practice_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
