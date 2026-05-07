-- CreateEnum
CREATE TYPE "AiFeatureType" AS ENUM ('EMBEDDING', 'ROLEPLAY_LLM', 'EVALUATOR_LLM', 'REALTIME_VOICE', 'TTS', 'STT');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('GOOGLE', 'OPENAI', 'ANTHROPIC', 'ELEVENLABS');

-- CreateTable
CREATE TABLE "ai_model_catalog" (
    "id" TEXT NOT NULL,
    "featureType" "AiFeatureType" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "inputModalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "outputType" TEXT NOT NULL,
    "dimensionOptions" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "defaultDimension" INTEGER,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feature_settings" (
    "id" TEXT NOT NULL,
    "featureType" "AiFeatureType" NOT NULL,
    "activeModelId" TEXT,
    "outputDimension" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_feature_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_benchmarks" (
    "id" TEXT NOT NULL,
    "modelCatalogId" TEXT NOT NULL,
    "featureType" "AiFeatureType" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "sampleText" TEXT NOT NULL,
    "outputDimension" INTEGER,
    "embeddingDimension" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_model_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_catalog_featureType_provider_modelId_key" ON "ai_model_catalog"("featureType", "provider", "modelId");

-- CreateIndex
CREATE INDEX "ai_model_catalog_featureType_isActive_idx" ON "ai_model_catalog"("featureType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ai_feature_settings_featureType_key" ON "ai_feature_settings"("featureType");

-- CreateIndex
CREATE INDEX "ai_model_benchmarks_featureType_createdAt_idx" ON "ai_model_benchmarks"("featureType", "createdAt");

-- CreateIndex
CREATE INDEX "ai_model_benchmarks_modelCatalogId_createdAt_idx" ON "ai_model_benchmarks"("modelCatalogId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_feature_settings" ADD CONSTRAINT "ai_feature_settings_activeModelId_fkey" FOREIGN KEY ("activeModelId") REFERENCES "ai_model_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_model_benchmarks" ADD CONSTRAINT "ai_model_benchmarks_modelCatalogId_fkey" FOREIGN KEY ("modelCatalogId") REFERENCES "ai_model_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
