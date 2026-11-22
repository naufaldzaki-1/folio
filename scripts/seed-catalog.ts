import { PrismaClient } from "@prisma/client";
import { seedCatalog } from "../src/lib/career/catalog";

// Uses the pooled URL, which is reachable from more networks than the direct
// connection. DATABASE_URL must include pgbouncer=true so Prisma avoids the
// prepared statements that PgBouncer rejects.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

seedCatalog(prisma)
  .then(count => console.log(`Katalog: ${count} posisi junior tersedia.`))
  .catch(error => { console.error("Seed gagal:", error instanceof Error ? error.message : "unknown"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());