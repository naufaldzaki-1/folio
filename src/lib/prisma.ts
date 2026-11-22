import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// The transaction pooler (:6543) multiplexes many client connections onto few
// server ones, so a limit of 1 is safe to raise. Keeping it at 1 serialised
// every query: a page needing auth + catalog + history paid the full round trip
// three times. 10 stays far below the free-tier connection budget.
const raisePoolLimit = (url?: string) =>
  url && url.includes("connection_limit=1") ? url.replace("connection_limit=1", "connection_limit=10") : url;

const runtimeUrl = raisePoolLimit(process.env.DATABASE_URL);
if (runtimeUrl && runtimeUrl !== process.env.DATABASE_URL) process.env.DATABASE_URL = runtimeUrl;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;