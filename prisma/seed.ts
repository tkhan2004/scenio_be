import 'dotenv/config';
import { prisma } from "../src/config/database";
import { runDatabaseSeeds } from "./seeds";

async function main() {
  await runDatabaseSeeds();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
