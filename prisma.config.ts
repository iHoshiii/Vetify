import path from 'node:path';
import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  // Prisma CLI (migrate dev, db push, studio) uses DIRECT_URL
  // to bypass pgBouncer and connect directly to Supabase
  datasource: {
    url: env('DIRECT_URL'),
  },
});
