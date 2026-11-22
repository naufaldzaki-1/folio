import { z } from "zod";
import type { CapacityPlan, SkillGap } from "./gap";

// One item per learning week. The number of slots is decided by the capacity
// engine, so the model can never stretch or compress the schedule itself.
export type Slot = {
  index: number;
  week: number;
  skillId: string;
  skillName: string;
  priority: SkillGap["priority"];
  hours: number;
  blockStart: number;
  blockEnd: number;
};

export function buildSlots(plan: CapacityPlan): Slot[] {
  const slots: Slot[] = [];
  let week = 1;
  for (const gap of plan.covered) {
    const weeksNeeded = Math.max(1, Math.ceil(gap.estimatedHours / plan.weeklyHours));
    let hoursLeft = gap.estimatedHours;
    const blockStart = week;
    for (let offset = 0; offset < weeksNeeded; offset++) {
      const hours = Math.min(plan.weeklyHours, hoursLeft);
      slots.push({ index: slots.length, week, skillId: gap.skillId, skillName: gap.name, priority: gap.priority, hours, blockStart, blockEnd: blockStart + weeksNeeded - 1 });
      hoursLeft -= hours;
      week++;
    }
  }
  return slots;
}

export function consolidationHours(plan: CapacityPlan) {
  if (!plan.covered.length || plan.leftoverWeeks <= 0) return 0;
  return plan.leftoverWeeks * plan.weeklyHours;
}

export const roadmapsStatus = ["active", "completed", "archived"] as const;

// Stored in `roadmaps.roadmap_json`. Keeping the gap table and the capacity
// decision next to the items makes the roadmap auditable later.
export const roadmapSnapshotSchema = z.object({
  version: z.literal("roadmap-v1"),
  targetPosition: z.object({ id: z.string(), title: z.string(), category: z.string() }),
  source: z.object({ kind: z.enum(["analysis", "manual"]), analysisId: z.string().nullable(), label: z.string(), note: z.string() }),
  capacity: z.object({
    durationMonths: z.number().int(),
    weeklyStudyHours: z.number().int(),
    totalWeeks: z.number().int(),
    capacityHours: z.number().int(),
    requiredHours: z.number().int(),
    coveredHours: z.number().int(),
    leftoverWeeks: z.number().int(),
  }),
  gaps: z.array(z.object({
    skillId: z.string(),
    name: z.string(),
    status: z.enum(["owned", "improve", "missing"]),
    priority: z.enum(["Tinggi", "Sedang", "Rendah"]),
    importanceWeight: z.number(),
    isRequired: z.boolean(),
    reason: z.string(),
    evidence: z.string(),
    estimatedHours: z.number().int(),
    covered: z.boolean(),
  })),
  notes: z.array(z.string()),
  // Primitive-only record so the value is a valid Prisma JSON column payload.
  modelMetadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).nullable(),
});
export type RoadmapSnapshot = z.infer<typeof roadmapSnapshotSchema>;
