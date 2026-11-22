import type { PrismaClient } from "@prisma/client";

// Two MVP templates. `template_config_json` stores presentation only, so adding
// a template never requires a schema change (PRD §7 "katalog dapat diperluas").
export const cvTemplates = [
  {
    slug: "klasik",
    name: "Klasik ATS",
    description: "Format ATS satu kolom, heading navy bergaris. Tanpa foto, aman untuk ATS dan cetak hitam-putih.",
    config: { layout: "single-column", accent: "#1B365D", headingStyle: "rule", fontFamily: "Helvetica", showPhoto: false },
  },
  {
    slug: "modern",
    name: "Modern ATS",
    description: "Format ATS satu kolom, heading biru tua. Tanpa foto, cocok untuk dikirim sebagai PDF.",
    config: { layout: "single-column", accent: "#2D4A7A", headingStyle: "rule", fontFamily: "Helvetica", showPhoto: false },
  },
] as const;

// cv_templates has no unique constraint on name in the existing schema, so
// idempotency is enforced here instead of relying on skipDuplicates.
export async function seedCvTemplates(prisma: PrismaClient) {
  const existing = await prisma.cvTemplate.findMany({ select: { name: true } });
  const known = new Set(existing.map(item => item.name));
  const missing = cvTemplates.filter(item => !known.has(item.name));
  if (missing.length) {
    await prisma.cvTemplate.createMany({
      data: missing.map(item => ({ name: item.name, description: item.description, templateConfigJson: item.config })),
    });
  }
  return cvTemplates.length;
}
