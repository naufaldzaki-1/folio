import type { PrismaClient } from "@prisma/client";
import { aiMetadata } from "@/lib/career/llm";
import { profileSchema } from "@/lib/career/schema";
import { analyzeGaps, planCapacity, profileEvidence, type CatalogSkill, type SkillGap } from "./gap";
import { buildSlots, consolidationHours, roadmapSnapshotSchema, type Slot } from "./plan";
import { generateRoadmapContent } from "./llm";
import { roadmapRequestSchema, type RoadmapRequest } from "./schema";

export type RoadmapDraft = {
  snapshot: ReturnType<typeof roadmapSnapshotSchema.parse>;
  items: {
    title: string; description: string; skillId: string | null; periodNumber: number;
    estimatedHours: number; expectedOutcome: string;
  }[];
  gaps: SkillGap[];
  plan: ReturnType<typeof planCapacity>;
  slots: Slot[];
};

// Manual entry is treated exactly like extracted skills (no fake evidence): the
// user's own claim is the source, which keeps the explanation honest.
function manualProfile(skills: string[]) {
  return {
    education: [], experience: [], projects: [], certifications: [],
    skills: skills.map(value => ({ value, evidence: "Diisi manual oleh pengguna" })),
  };
}

export async function loadSkillSource(prisma: PrismaClient, userId: string, request: RoadmapRequest) {
  if (request.careerAnalysisId) {
    const analysis = await prisma.careerAnalysis.findFirst({
      where: { id: request.careerAnalysisId, userId, status: "completed" },
      include: { careerProfile: true, uploadedFile: { select: { originalFilename: true } } },
    });
    if (!analysis) throw new Error("Analisis tidak ditemukan pada akun ini atau belum selesai. Pilih input manual jika ingin mulai dari nol.");
    const parsed = profileSchema.safeParse(analysis.careerProfile?.extractedProfileJson);
    if (!parsed.success) throw new Error("Profil analisis tidak dapat dibaca. Buka Career Analysis, periksa profil, lalu coba lagi.");
    // The CV filename is the user's own mental handle for a profile ("CV Salsabila"),
    // so it is shown in messages instead of a job title they never chose.
    const label = analysis.uploadedFile?.originalFilename?.trim() || "CV hasil Career Analysis";
    return { source: "analysis" as const, analysisId: analysis.id, profile: parsed.data, label };
  }
  if (!request.manualSkills.length) throw new Error("Isi keterampilan awal secara manual atau pilih hasil Career Analysis.");
  return { source: "manual" as const, analysisId: null, profile: manualProfile(request.manualSkills), label: "input manual" };
}

export async function buildRoadmap(prisma: PrismaClient, userId: string, payload: unknown) {
  const request = roadmapRequestSchema.parse(payload);
  const position = await prisma.jobPosition.findFirst({
    where: { id: request.targetJobPositionId, isActive: true },
    include: { category: true, skills: { include: { skill: true } } },
  });
  if (!position) throw new Error("Posisi target tidak ditemukan pada katalog.");
  if (!position.skills.length) throw new Error("Posisi target belum memiliki kriteria kompetensi di katalog.");

  const skillSource = await loadSkillSource(prisma, userId, request);
  const catalog: CatalogSkill[] = position.skills.map(item => ({
    skillId: item.skillId,
    name: item.skill.name,
    normalizedName: item.skill.normalizedName,
    importanceWeight: item.importanceWeight,
    requiredLevel: item.requiredLevel,
    isRequired: item.isRequired,
  }));
  const evidence = profileEvidence(skillSource.profile);
  const { gaps, open } = analyzeGaps(catalog, evidence.skills, evidence.other);
  const plan = planCapacity(open, request.durationMonths, request.weeklyStudyHours);
  // Two different situations must not share one message:
  //  - no gap at all   -> the profile already covers the catalog; nothing to plan.
  //  - gaps but no room -> capacity is genuinely too small.
  if (!open.length) {
    throw new Error(`Profil pada ${skillSource.label} sudah memenuhi seluruh kompetensi katalog ${position.title} (${catalog.length}/${catalog.length} cocok). Tidak ada skill gap untuk dijadwalkan, jadi pilih posisi target lain yang kompetensinya belum kamu miliki.`);
  }
  if (!plan.covered.length) {
    throw new Error(`Kapasitas ${plan.capacityHours} jam (${request.durationMonths} bulan × ${request.weeklyStudyHours} jam/minggu) belum cukup untuk satu pun dari ${open.length} kompetensi yang kurang. Tambah durasi atau jam belajar.`);
  }
  const slots = buildSlots(plan);
  const content = await generateRoadmapContent({
    position: { title: position.title, category: position.category.name, description: position.description },
    gaps: plan.covered,
    plan,
    slots,
    preferences: request.preferences,
    source: skillSource.source,
  });
  const items: RoadmapDraft["items"] = slots.map((slot, index) => ({
    title: content.weeks[index].title,
    description: [content.weeks[index].objective, `Materi: ${content.weeks[index].material}`, `Latihan: ${content.weeks[index].practice}`].join(" | "),
    skillId: slot.skillId,
    periodNumber: slot.week,
    estimatedHours: slot.hours,
    expectedOutcome: content.weeks[index].expectedOutcome,
  }));
  const consolidate = consolidationHours(plan);
  if (consolidate > 0) {
    items.push({
      title: `Konsolidasi portofolio (${plan.leftoverWeeks} minggu sisa)`,
      description: "Gabungkan hasil latihan menjadi satu portofolio ringkas, perbarui CV dengan bukti proyek, dan latih kemampuan menjelaskan keputusan.",
      skillId: null,
      periodNumber: plan.totalWeeks,
      estimatedHours: consolidate,
      expectedOutcome: "Portofolio dan CV yang bisa ditunjukkan, bukan hanya daftar materi yang sudah ditonton.",
    });
  }
  const snapshot = roadmapSnapshotSchema.parse({
    version: "roadmap-v1",
    targetPosition: { id: position.id, title: position.title, category: position.category.name },
    source: {
      kind: skillSource.source,
      analysisId: skillSource.analysisId,
      label: skillSource.label,
      note: skillSource.source === "analysis"
        ? `Skill gap dihitung dari profil Career Analysis (${skillSource.label}) yang sudah dikonfirmasi pengguna.`
        : "Skill gap dihitung dari daftar keterampilan yang diisi manual oleh pengguna.",
    },
    capacity: {
      durationMonths: request.durationMonths,
      weeklyStudyHours: request.weeklyStudyHours,
      totalWeeks: plan.totalWeeks,
      capacityHours: plan.capacityHours,
      requiredHours: plan.requiredHours,
      coveredHours: plan.coveredHours,
      leftoverWeeks: plan.leftoverWeeks,
    },
    gaps: gaps.map(gap => ({
      skillId: gap.skillId, name: gap.name, status: gap.status, priority: gap.priority,
      importanceWeight: gap.importanceWeight, isRequired: gap.isRequired, reason: gap.reason,
      evidence: gap.evidence, estimatedHours: gap.estimatedHours, covered: gap.covered,
    })),
    notes: plan.notes,
    modelMetadata: aiMetadata(),
  });
  return { snapshot, items, gaps, plan, slots, positionId: position.id, request };
}
