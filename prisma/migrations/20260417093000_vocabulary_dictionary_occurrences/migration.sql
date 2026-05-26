-- Vocabulary system upgrade:
-- 1. Convert user_vocabulary into dictionary aggregate rows
-- 2. Add occurrence table to store repeated encounters by session

ALTER TABLE "user_vocabulary"
  ADD COLUMN "normalizedWord" TEXT,
  ADD COLUMN "encounterCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "srsLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextReviewAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "user_vocabulary" uv
SET
  "word" = COALESCE(uv."word", sv."word"),
  "definition" = COALESCE(uv."definition", sv."definition")
FROM "scene_vocabulary" sv
WHERE uv."sceneVocabularyId" = sv."id";

UPDATE "user_vocabulary"
SET
  "normalizedWord" = lower(btrim("word")),
  "lastSeenAt" = COALESCE("reviewedAt", "savedAt")
WHERE "normalizedWord" IS NULL;

-- Legacy cleanup:
-- Some older local rows were created without sceneVocabularyId and without manual word/definition.
-- These rows cannot be upgraded into dictionary entries, so remove them before NOT NULL constraints.
DELETE FROM "user_vocabulary"
WHERE COALESCE(NULLIF(btrim("word"), ''), NULL) IS NULL
   OR COALESCE(NULLIF(btrim("definition"), ''), NULL) IS NULL
   OR COALESCE(NULLIF(btrim("normalizedWord"), ''), NULL) IS NULL;

ALTER TABLE "user_vocabulary"
  ALTER COLUMN "word" SET NOT NULL,
  ALTER COLUMN "definition" SET NOT NULL,
  ALTER COLUMN "normalizedWord" SET NOT NULL;

ALTER TABLE "user_vocabulary"
  DROP CONSTRAINT IF EXISTS "user_vocabulary_userId_sceneVocabularyId_key";

CREATE UNIQUE INDEX "user_vocabulary_userId_normalizedWord_key"
  ON "user_vocabulary"("userId", "normalizedWord");

CREATE INDEX "user_vocabulary_userId_nextReviewAt_idx"
  ON "user_vocabulary"("userId", "nextReviewAt");

CREATE TABLE "user_vocabulary_occurrences" (
  "id" TEXT NOT NULL,
  "userVocabularyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "sampleSentence" TEXT,
  "sourceMessageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_vocabulary_occurrences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_vocabulary_occurrences_userVocabularyId_sessionId_key"
  ON "user_vocabulary_occurrences"("userVocabularyId", "sessionId");

CREATE INDEX "user_vocabulary_occurrences_userId_createdAt_idx"
  ON "user_vocabulary_occurrences"("userId", "createdAt");

CREATE INDEX "user_vocabulary_occurrences_sessionId_idx"
  ON "user_vocabulary_occurrences"("sessionId");

CREATE INDEX "user_vocabulary_occurrences_userVocabularyId_idx"
  ON "user_vocabulary_occurrences"("userVocabularyId");

ALTER TABLE "user_vocabulary_occurrences"
  ADD CONSTRAINT "user_vocabulary_occurrences_userVocabularyId_fkey"
  FOREIGN KEY ("userVocabularyId") REFERENCES "user_vocabulary"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_vocabulary_occurrences"
  ADD CONSTRAINT "user_vocabulary_occurrences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_vocabulary_occurrences"
  ADD CONSTRAINT "user_vocabulary_occurrences_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "sessions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "user_vocabulary_occurrences" (
  "id",
  "userVocabularyId",
  "userId",
  "sessionId",
  "createdAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || uv."id"),
  uv."id",
  uv."userId",
  uv."sourceSessionId",
  uv."savedAt"
FROM "user_vocabulary" uv
WHERE uv."sourceSessionId" IS NOT NULL;
