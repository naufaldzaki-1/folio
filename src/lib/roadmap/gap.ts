import { mentionsSkill } from "@/lib/career/matching";
import type { Profile } from "@/lib/career/schema";


export type CatalogSkill = {
  skillId: string;
  name: string;
  normalizedName: string;
  importanceWeight: number;
  requiredLevel: string | null;
  isRequired: boolean;
};

export type GapStatus = "owned" | "improve" | "missing";

export type SkillGap = {
  skillId: string;
  name: string;
  importanceWeight: number;
  requiredLevel: string | null;
  isRequired: boolean;
  status: GapStatus;
  priorityScore: number;
  priority: "Tinggi" | "Sedang" | "Rendah";
  reason: string;
  evidence: string;
  estimatedHours: number;
  covered: boolean;
};

// Baseline learning hours per competence, per expected level. These are planning
// estimates, not measured data; they exist so capacity (duration × weekly hours)
// can be compared with demand instead of guessed.
const levelHours: Record<string, number> = { beginner: 10, intermediate: 24, advanced: 40 };

export function estimateHours(skill: CatalogSkill, status: GapStatus) {
  const base = levelHours[(skill.requiredLevel ?? "beginner").toLowerCase()] ?? 10;
  // An "improve" gap already has working evidence in the CV, so it needs less
  // time than a competence that was never found.
  return Math.max(4, Math.round(status === "improve" ? base * 0.5 : base));
}

export function gapStatusOf(skill: CatalogSkill, current: { value: string; evidence: string }[], other: { text: string; source: string }[]) {
  const owned = current.find(item => mentionsSkill(item.value, { name: skill.name, normalizedName: skill.normalizedName }));
  if (owned) {
    // Keep the origin visible: a CV skill points at its CV quote, a manually
    // typed skill points at the user's own entry.
    const source = owned.evidence && owned.evidence !== owned.value ? ` (sumber: ${owned.evidence.slice(0, 120)})` : "";
    return { status: "owned" as GapStatus, evidence: `Keterampilan CV: "${owned.value}"${source}` };
  }
  const adjacent = other.find(item => mentionsSkill(item.text, { name: skill.name, normalizedName: skill.normalizedName }));
  if (adjacent) return { status: "improve" as GapStatus, evidence: `${adjacent.source}: "${adjacent.text.slice(0, 180)}"` };
  return { status: "missing" as GapStatus, evidence: "Belum ditemukan dalam data profil yang dipakai." };
}


function reasonOf(status: GapStatus, skill: CatalogSkill) {
  if (status === "owned") return "Sudah tercantum sebagai keterampilan. Fokus pada bukti proyek dan penerapan nyata.";
  if (status === "improve") return "Sudah muncul pada pengalaman/proyek, tetapi belum dinyatakan sebagai keterampilan. Perlu diperdalam dan dibuktikan.";
  return `Belum ditemukan dalam profil. Bobot kepentingan ${skill.importanceWeight}/5 untuk posisi target${skill.isRequired ? " dan termasuk kriteria wajib" : ""}.`;
}

// Deterministic: the same profile and catalog always produce the same gaps and
// priorities. The LLM never decides which gaps exist or how many hours they take.
export function analyzeGaps(catalog: CatalogSkill[], profileSkills: { value: string; evidence: string }[], otherEvidence: { text: string; source: string }[]) {
  const gaps: SkillGap[] = catalog.map(skill => {
    const { status, evidence } = gapStatusOf(skill, profileSkills, otherEvidence);
    return {
      skillId: skill.skillId,
      name: skill.name,
      importanceWeight: skill.importanceWeight,
      requiredLevel: skill.requiredLevel,
      isRequired: skill.isRequired,
      status,
      priorityScore: skill.importanceWeight * 10 + (skill.isRequired ? 15 : 0) + (status === "missing" ? 5 : 0) + (status === "improve" ? 2 : 0),
      priority: "Rendah" as SkillGap["priority"],
      reason: reasonOf(status, skill),
      evidence,
      estimatedHours: estimateHours(skill, status),
      covered: false,
    };
  });
  const open = gaps.filter(gap => gap.status !== "owned").sort((a, b) => b.priorityScore - a.priorityScore);
  const third = Math.floor(open.length / 3);
  open.forEach((gap, index) => {
    if (open.length <= 1) gap.priority = "Tinggi";
    else if (index < Math.max(1, third)) gap.priority = "Tinggi";
    else if (index < Math.max(2, open.length - third)) gap.priority = "Sedang";
    else gap.priority = "Rendah";
  });
  return { gaps, open };
}

export type CapacityPlan = {
  totalWeeks: number;
  weeklyHours: number;
  capacityHours: number;
  requiredHours: number;
  coveredHours: number;
  covered: SkillGap[];
  deferred: SkillGap[];
  leftoverWeeks: number;
  notes: string[];
};

// Greedy allocation in priority order. A competence is only placed on the plan
// when its full estimated hours fit; the rest is reported as not covered instead
// of being compressed into an unrealistic schedule (PRD FR-CR-09).
export function planCapacity(open: SkillGap[], durationMonths: number, weeklyHours: number): CapacityPlan {
  const totalWeeks = durationMonths * 4;
  const capacityHours = totalWeeks * weeklyHours;
  let remaining = capacityHours;
  let remainingWeeks = totalWeeks;
  const covered: SkillGap[] = [];
  const deferred: SkillGap[] = [];
  for (const gap of open) {
    const weeksNeeded = Math.max(1, Math.ceil(gap.estimatedHours / weeklyHours));
    if (gap.estimatedHours <= remaining && weeksNeeded <= remainingWeeks) {
      gap.covered = true;
      covered.push(gap);
      remaining -= gap.estimatedHours;
      remainingWeeks -= weeksNeeded;
    } else deferred.push(gap);
  }
  const coveredHours = covered.reduce((sum, gap) => sum + gap.estimatedHours, 0);
  const requiredHours = open.reduce((sum, gap) => sum + gap.estimatedHours, 0);
  const notes: string[] = [];
  if (deferred.length) {
    notes.push(`${deferred.length} kompetensi belum tercakup dalam ${durationMonths} bulan × ${weeklyHours} jam/minggu: ${deferred.map(gap => gap.name).join(", ")}. Perpanjang durasi, tambah jam belajar, atau susun roadmap lanjutan untuk kompetensi ini.`);
  }
  if (!covered.length) notes.push("Kapasitas belajar belum cukup untuk satu kompetensi pun. Pilih durasi lebih panjang atau jam belajar lebih banyak.");
  if (remainingWeeks > 0 && covered.length) notes.push(`${remainingWeeks} minggu sisa dipakai untuk konsolidasi, latihan mandiri, dan penyusunan portofolio.`);
  if (capacityHours > 0 && coveredHours) notes.push(`Estimasi ${coveredHours} jam belajar dari kapasitas ${capacityHours} jam. Angka ini perencanaan, bukan jaminan kesiapan kerja.`);
  return { totalWeeks, weeklyHours, capacityHours, requiredHours, coveredHours, covered, deferred, leftoverWeeks: remainingWeeks, notes };
}

// Turns a confirmed/edited Career Analysis profile into the two evidence lists
// the gap engine needs, so roadmap and analysis always read the same facts.
export function profileEvidence(profile: Profile) {
  return {
    skills: profile.skills.map(item => ({ value: item.value, evidence: item.evidence })),
    other: [
      ...profile.experience.map(item => ({ text: item.value, source: "Pengalaman CV" })),
      ...profile.projects.map(item => ({ text: item.value, source: "Proyek CV" })),
      ...profile.certifications.map(item => ({ text: item.value, source: "Sertifikasi/pelatihan CV" })),
      ...profile.education.map(item => ({ text: item.value, source: "Pendidikan CV" })),
    ],
  };
}

