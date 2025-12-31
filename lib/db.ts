const shouldSkip = process.env.SKIP_PRISMA_GENERATION === 'true';

let PrismaClientCtor: typeof import('@prisma/client').PrismaClient | null = null;

if (!shouldSkip) {
  PrismaClientCtor = require('@prisma/client').PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: import('@prisma/client').PrismaClient };

const prismaInstance = shouldSkip
  ? (new Proxy(
      {},
      {
        get() {
          throw new Error('Prisma client is not available in this environment.');
        }
      }
    ) as unknown as import('@prisma/client').PrismaClient)
  : (globalForPrisma.prisma ||
      new PrismaClientCtor!({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
      }));

if (!shouldSkip && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;

export default prismaInstance;
