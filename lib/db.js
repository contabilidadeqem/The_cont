import { PrismaClient } from "@prisma/client";

// Evita múltiplas instâncias do Prisma Client em dev (hot reload do Next.js)
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
