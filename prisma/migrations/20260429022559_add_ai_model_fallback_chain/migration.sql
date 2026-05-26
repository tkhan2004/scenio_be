-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_sceneId_fkey";

-- DropIndex
DROP INDEX "user_vocabulary_userId_sceneVocabularyId_key";

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
