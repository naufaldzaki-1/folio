import { strict as assert } from "node:assert";
import { test } from "node:test";
import { analyzeGaps, planCapacity, profileEvidence, type CatalogSkill } from "../src/lib/roadmap/gap";
import { buildSlots, consolidationHours } from "../src/lib/roadmap/plan";
import type { Profile } from "../src/lib/career/schema";

const catalog: CatalogSkill[] = [
  { skillId: "s1", name: "SQL", normalizedName: "sql", importanceWeight: 5, requiredLevel: "Beginner", isRequired: true },
  { skillId: "s2", name: "Python", normalizedName: "python", importanceWeight: 4, requiredLevel: "Beginner", isRequired: true },
  { skillId: "s3", name: "Data Visualization", normalizedName: "data visualization", importanceWeight: 3, requiredLevel: "Beginner", isRequired: false },
  { skillId: "s4", name: "Statistics", normalizedName: "statistics", importanceWeight: 2, requiredLevel: "Beginner", isRequired: false },
  { skillId: "s5", name: "ETL", normalizedName: "etl", importanceWeight: 1, requiredLevel: "Beginner", isRequired: false },
];

const profile: Profile = {
  education: [],
  experience: [{ value: "Magang sebagai analis dengan Python dan pandas", evidence: "Magang sebagai analis dengan Python dan pandas" }],
  projects: [],
  skills: [{ value: "SQL", evidence: "SQL" }],
  certifications: [],
};

test("gap analysis separates owned, improvable and missing competences", () => {
  const evidence = profileEvidence(profile);
  const { gaps } = analyzeGaps(catalog, evidence.skills, evidence.other);
  const byName = new Map(gaps.map(gap => [gap.name, gap]));
  assert.equal(byName.get("SQL")!.status, "owned");
  // Python appears in an experience bullet, not in the skill list.
  assert.equal(byName.get("Python")!.status, "improve");
  assert.equal(byName.get("Data Visualization")!.status, "missing");
  assert.equal(byName.get("SQL")!.priorityScore < byName.get("Data Visualization")!.priorityScore, false);
});

test("priority is ordered by importance weight and required flag", () => {
  const evidence = profileEvidence(profile);
  const { open } = analyzeGaps(catalog, evidence.skills, evidence.other);
  assert.deepEqual(open.map(gap => gap.name), ["Python", "Data Visualization", "Statistics", "ETL"]);
  assert.equal(open[0].priority, "Tinggi");
});

test("a short plan defers competences instead of compressing them", () => {
  const evidence = profileEvidence(profile);
  const { open } = analyzeGaps(catalog, evidence.skills, evidence.other);
  // 1 month x 5 h/week = 20 h: not enough for every gap.
  const plan = planCapacity(open, 1, 5);
  assert.equal(plan.capacityHours, 20);
  assert.ok(plan.deferred.length > 0);
  assert.ok(plan.notes.some(note => /belum tercakup/i.test(note)));
  assert.equal(plan.covered.every(gap => gap.covered), true);
  assert.equal(plan.deferred.every(gap => !gap.covered), true);
});

test("a long plan covers more competences than a short one", () => {
  const evidence = profileEvidence(profile);
  const short = planCapacity(analyzeGaps(catalog, evidence.skills, evidence.other).open, 1, 5);
  const long = planCapacity(analyzeGaps(catalog, evidence.skills, evidence.other).open, 12, 20);
  assert.ok(long.covered.length >= short.covered.length);
  assert.equal(long.deferred.length, 0);
});

test("weekly slots match the covered hours and stay inside the plan window", () => {
  const evidence = profileEvidence(profile);
  const plan = planCapacity(analyzeGaps(catalog, evidence.skills, evidence.other).open, 3, 10);
  const slots = buildSlots(plan);
  assert.equal(slots.reduce((sum, slot) => sum + slot.hours, 0), plan.coveredHours);
  assert.ok(slots.every(slot => slot.week <= plan.totalWeeks));
  assert.deepEqual(slots.map(slot => slot.index), slots.map((_, index) => index));
  // Leftover capacity is reported as consolidation, never as extra weeks.
  assert.equal(consolidationHours(plan), plan.leftoverWeeks * plan.weeklyHours);
});

test("manual skills count as owned without inventing CV evidence", () => {
  const manual: Profile = { education: [], experience: [], projects: [], certifications: [], skills: [{ value: "Tableau", evidence: "Diisi manual oleh pengguna" }] };
  const evidence = profileEvidence(manual);
  const { gaps } = analyzeGaps(catalog, evidence.skills, evidence.other);
  const visualization = gaps.find(gap => gap.name === "Data Visualization")!;
  // The alias engine maps Tableau onto Data Visualization.
  assert.equal(visualization.status, "owned");
  assert.match(visualization.evidence, /Diisi manual oleh pengguna/);
});
