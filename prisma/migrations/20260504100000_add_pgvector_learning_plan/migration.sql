-- CreateEnum
CREATE TYPE "LearningPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LearningPlanStepStatus" AS ENUM ('LOCKED', 'NEXT', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LearningPlanStepType" AS ENUM ('SCENE', 'VOCABULARY_REVIEW', 'GRAMMAR_PRACTICE', 'RETRY_SCENE', 'CUSTOM_PRACTICE');

-- CreateEnum
CREATE TYPE "LearningFocusSkill" AS ENUM ('GRAMMAR', 'VOCABULARY', 'NATURALNESS', 'CONFIDENCE');

-- CreateTable
CREATE TABLE "scene_embeddings" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "outputDimension" INTEGER NOT NULL,
    "embeddingText" TEXT NOT NULL,
    "embeddingHash" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scene_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "LearningPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "learningGoal" TEXT,
    "studyFrequency" TEXT,
    "focusSkill" "LearningFocusSkill" NOT NULL,
    "weeklyTarget" INTEGER NOT NULL,
    "generatedBy" TEXT NOT NULL DEFAULT 'RULE',
    "sourceSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_plan_steps" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sceneId" TEXT,
    "type" "LearningPlanStepType" NOT NULL,
    "status" "LearningPlanStepStatus" NOT NULL DEFAULT 'LOCKED',
    "focusSkill" "LearningFocusSkill" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_plan_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scene_embeddings_sceneId_key" ON "scene_embeddings"("sceneId");

-- CreateIndex
CREATE INDEX "scene_embeddings_provider_modelId_idx" ON "scene_embeddings"("provider", "modelId");

-- CreateIndex
CREATE INDEX "learning_plans_userId_status_idx" ON "learning_plans"("userId", "status");

-- CreateIndex
CREATE INDEX "learning_plan_steps_planId_status_idx" ON "learning_plan_steps"("planId", "status");

-- CreateIndex
CREATE INDEX "learning_plan_steps_sceneId_idx" ON "learning_plan_steps"("sceneId");

-- AddForeignKey
ALTER TABLE "scene_embeddings" ADD CONSTRAINT "scene_embeddings_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plans" ADD CONSTRAINT "learning_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_steps" ADD CONSTRAINT "learning_plan_steps_planId_fkey" FOREIGN KEY ("planId") REFERENCES "learning_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_plan_steps" ADD CONSTRAINT "learning_plan_steps_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pgvector is optional for local fallback mode. If the extension is unavailable,
-- scalar embedding metadata remains usable and runtime search falls back to text.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension is unavailable; vector column/index skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE "scene_embeddings" ADD COLUMN IF NOT EXISTS "embedding" vector(1536)';
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS "scene_embeddings_embedding_hnsw_idx" ON "scene_embeddings" USING hnsw ("embedding" vector_cosine_ops)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'HNSW index unavailable, trying IVFFlat: %', SQLERRM;
      BEGIN
        EXECUTE 'CREATE INDEX IF NOT EXISTS "scene_embeddings_embedding_ivfflat_idx" ON "scene_embeddings" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100)';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'IVFFlat index unavailable; vector search will run without ANN index: %', SQLERRM;
      END;
    END;
  END IF;
END $$;
