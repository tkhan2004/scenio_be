import { prisma } from "../src/config/database";
import { runHomeSeed } from "./home-seed";

async function main() {
  await runHomeSeed();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
