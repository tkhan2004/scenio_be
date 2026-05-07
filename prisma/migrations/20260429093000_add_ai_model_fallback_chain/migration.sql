-- AlterTable
ALTER TABLE "ai_feature_settings" ADD COLUMN "fallbackModelIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
