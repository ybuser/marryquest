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
      (globalForPrisma.prisma = new PrismaClientCtor!({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
      })));

export const prisma = prismaInstance;

export default prismaInstance;
