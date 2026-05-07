import 'dotenv/config';
import prisma from '../src/config/database';
import { backfillSceneEmbeddings } from '../src/modules/scene-embeddings/scene-embeddings.service';

async function main() {
  const force = process.argv.includes('--force');
  const result = await backfillSceneEmbeddings({ force });
  console.log('Scene embedding backfill completed.');
  console.log(`- Total active scenes: ${result.total}`);
  console.log(`- Updated: ${result.updated}`);
  console.log(`- Skipped: ${result.skipped}`);
  console.log(`- Failed: ${result.failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
