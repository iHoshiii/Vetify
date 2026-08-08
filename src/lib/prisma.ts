import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent multiple Prisma Client instances in development
// (Next.js hot-reload creates new module instances, which would exhaust DB connections)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // DATABASE_URL uses pgBouncer pooled connection (port 6543) for runtime queries
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
