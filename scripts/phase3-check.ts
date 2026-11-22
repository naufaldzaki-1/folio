import { PrismaClient } from "@prisma/client";
import { analyzeGaps, planCapacity, profileEvidence, type CatalogSkill } from "../src/lib/roadmap/gap";
import { buildSlots, consolidationHours } from "../src/lib/roadmap/plan";
import { generateRoadmapContent } from "../src/lib/roadmap/llm";
import { rewriteCvContent } from "../src/lib/cv/llm";
import { cvContentSchema } from "../src/lib/cv/schema";

// Real end-to-end check for the Fase 3 LLM calls. It prints metadata only:
// no CV text, no API key, no prompts.
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

function report(stage: string, ok: boolean, extra: Record<string, unknown>) {
  console.log(JSON.stringify({ stage, ok, ...extra }));
}

async function main() {
  const position = await prisma.jobPosition.findFirst({
    where: { isActive: true, title: { contains: "Data Analyst" }, skills: { some: {} } },
    include: { category: true, skills: { include: { skill: true } } },
  });
  if (!position) throw new Error("Katalog belum berisi posisi Data Analyst. Jalankan catalog:seed dahulu.");

  const catalog: CatalogSkill[] = position.skills.map(item => ({
    skillId: item.skillId, name: item.skill.name, normalizedName: item.skill.normalizedName,
    importanceWeight: item.importanceWeight, requiredLevel: item.requiredLevel, isRequired: item.isRequired,
  }));
  // Manual-input path: the user has Excel and SQL only.
  const profile = { education: [], experience: [], projects: [], certifications: [], skills: [{ value: "Excel", evidence: "Diisi manual oleh pengguna" }, { value: "SQL", evidence: "Diisi manual oleh pengguna" }] };
  const evidence = profileEvidence(profile);
  const { gaps, open } = analyzeGaps(catalog, evidence.skills, evidence.other);
  const plan = planCapacity(open, 1, 10);
  const slots = buildSlots(plan);
  report("gap", true, { owned: gaps.filter(g => g.status === "owned").length, open: open.length, covered: plan.covered.length, deferred: plan.deferred.length, slots: slots.length, capacityHours: plan.capacityHours });

  if (!plan.covered.length) throw new Error("Kapasitas percobaan tidak menutup satu kompetensi pun.");
  const started = Date.now();
  const content = await generateRoadmapContent({
    position: { title: position.title, category: position.category.name, description: position.description },
    gaps: plan.covered, plan, slots, preferences: "", source: "manual",
  });
  report("roadmap", content.weeks.length === slots.length, {
    elapsedMs: Date.now() - started,
    weeks: content.weeks.length,
    expectedWeeks: slots.length,
    avgTitleLength: Math.round(content.weeks.reduce((sum, week) => sum + week.title.length, 0) / content.weeks.length),
    consolidationHours: consolidationHours(plan),
  });

  const cv = cvContentSchema.parse({
    contact: { fullName: "Budi Santoso", headline: "Data Analyst", email: "budi@example.com", phone: "", location: "Semarang", links: [] },
    summary: "",
    education: [{ id: "edu-1", title: "D4 Teknik Informatika", organization: "Politeknik Negeri Semarang", period: "2022 - 2026", description: "" }],
    experience: [{ id: "exp-1", title: "Magang Data Analyst", organization: "PT Contoh", period: "2025", description: "Membuat dashboard penjualan bulanan dengan SQL dan Excel" }],
    projects: [], certifications: [],
    organizations: [],
    skills: ["SQL", "Excel"],
    sectionOrder: ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"],
  });
  const assistStart = Date.now();
  const assist = await rewriteCvContent({ target: "summary", content: cv, role: "Data Analyst" });
  report("cv-summary", assist.text.length > 0, { elapsedMs: Date.now() - assistStart, length: assist.text.length, usedFacts: assist.usedFacts.length });
  const rewriteStart = Date.now();
  const rewrite = await rewriteCvContent({ target: "experience", content: cv, role: "Data Analyst", entryId: "exp-1" });
  report("cv-experience", rewrite.text.length > 0, { elapsedMs: Date.now() - rewriteStart, length: rewrite.text.length, usedFacts: rewrite.usedFacts.length });
}

main()
  .catch(error => { report("pipeline", false, { name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "unknown" }); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
