-- CreateEnum
CREATE TYPE "SessionModality" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "MessageModality" AS ENUM ('TEXT', 'AUDIO_TRANSCRIPT');

-- CreateEnum
CREATE TYPE "VoiceProvider" AS ENUM ('ELEVENLABS', 'OPENAI');

-- CreateEnum
CREATE TYPE "VoiceGender" AS ENUM ('MALE', 'FEMALE', 'NEUTRAL');

-- CreateTable
CREATE TABLE "voice_profiles" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "gender" "VoiceGender" NOT NULL DEFAULT 'NEUTRAL',
    "locale" TEXT,
    "accent" TEXT,
    "provider" "VoiceProvider" NOT NULL DEFAULT 'ELEVENLABS',
    "providerVoiceId" TEXT,
    "realtimeProvider" "VoiceProvider" NOT NULL DEFAULT 'OPENAI',
    "realtimeVoiceId" TEXT,
    "styleTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sampleText" TEXT,
    "sampleUrl" TEXT,
    "latencyTier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scene_voice_presets" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "defaultVoiceId" TEXT,
    "defaultMaleVoiceId" TEXT,
    "defaultFemaleVoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_voice_presets_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "sessions"
ADD COLUMN "modality" "SessionModality" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "providerSessionId" TEXT,
ADD COLUMN "voiceProfileId" TEXT,
ADD COLUMN "voiceProvider" "VoiceProvider",
ADD COLUMN "voiceSnapshotName" TEXT;

-- AlterTable
ALTER TABLE "messages"
ADD COLUMN "audioEndMs" INTEGER,
ADD COLUMN "audioStartMs" INTEGER,
ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "modality" "MessageModality" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "providerEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "scene_voice_presets_sceneId_key" ON "scene_voice_presets"("sceneId");

-- CreateIndex
CREATE INDEX "sessions_voiceProfileId_idx" ON "sessions"("voiceProfileId");

-- CreateIndex
CREATE INDEX "messages_providerEventId_idx" ON "messages"("providerEventId");

-- AddForeignKey
ALTER TABLE "scene_voice_presets" ADD CONSTRAINT "scene_voice_presets_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_voice_presets" ADD CONSTRAINT "scene_voice_presets_defaultVoiceId_fkey" FOREIGN KEY ("defaultVoiceId") REFERENCES "voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_voice_presets" ADD CONSTRAINT "scene_voice_presets_defaultMaleVoiceId_fkey" FOREIGN KEY ("defaultMaleVoiceId") REFERENCES "voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scene_voice_presets" ADD CONSTRAINT "scene_voice_presets_defaultFemaleVoiceId_fkey" FOREIGN KEY ("defaultFemaleVoiceId") REFERENCES "voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "voice_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
