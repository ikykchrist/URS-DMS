import { PrismaClient, type Prisma } from "@prisma/client";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

// =============================================================================
// URS-DMS — PrismaClient singleton
// =============================================================================

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const logLevels: Prisma.LogLevel[] = env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevels.map((level) => ({ emit: "event", level })),
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

prisma.$on("warn" as never, (e: Prisma.LogEvent) => logger.warn(`[prisma] ${e.message}`));
prisma.$on("error" as never, (e: Prisma.LogEvent) => logger.error(`[prisma] ${e.message}`));
