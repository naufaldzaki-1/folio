import { PrismaClient } from "@prisma/client";
import { seedCvTemplates } from "../src/lib/cv/templates";

// Same pooled-URL requirement as the catalog seeder (pgbouncer=true).
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

seedCvTemplates(prisma)
  .then(count => console.log(`Template CV: ${count} template tersedia.`))
  .catch(error => { console.error("Seed template gagal:", error instanceof Error ? error.message : "unknown"); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
