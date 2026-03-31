import { defineConfig } from '@prisma/config';
import 'dotenv/config';
import { env } from 'node:process';

export default defineConfig({
  datasource: {
    url: env.DATABASE_URL,
  },
});
