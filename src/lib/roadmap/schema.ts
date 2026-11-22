import { z } from "zod";

// Fixed choices from PRD §4.3. Validating the set (instead of a free number)
// keeps the capacity calculation honest: we never promise a 1-month plan that
// secretly needs 6 months of work.
export const roadmapDurations = [1, 3, 6, 12] as const;
export const roadmapWeeklyHours = [5, 10, 20] as const;
export const roadmapItemStatuses = ["not_started", "in_progress", "completed"] as const;
export type RoadmapItemStatus = (typeof roadmapItemStatuses)[number];

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID tidak valid.");

export const roadmapRequestSchema = z.object({
  targetJobPositionId: uuid,
  durationMonths: z.number().int().refine(value => (roadmapDurations as readonly number[]).includes(value), "Durasi harus 1, 3, 6, atau 12 bulan."),
  weeklyStudyHours: z.number().int().refine(value => (roadmapWeeklyHours as readonly number[]).includes(value), "Waktu belajar harus 5, 10, atau 20 jam per minggu."),
  careerAnalysisId: uuid.nullish(),
  // Manual input path: PRD FR-CR-05 requires the roadmap to work without a
  // Career Analysis, so the user can type their current skills.
  manualSkills: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  preferences: z.string().trim().max(300).default(""),
});
export type RoadmapRequest = z.infer<typeof roadmapRequestSchema>;

export const roadmapProgressSchema = z.object({ status: z.enum(roadmapItemStatuses) });

// The model only writes learning content for the slots our capacity engine
// allocated. Structure, hours and periods are never delegated to the model.
export const roadmapContentSchema = z.object({
  weeks: z.array(z.object({
    title: z.string().trim().min(3).max(120),
    objective: z.string().trim().min(3).max(300),
    material: z.string().trim().min(3).max(400),
    practice: z.string().trim().min(3).max(400),
    expectedOutcome: z.string().trim().min(3).max(300),
  })).min(1).max(60),
});
export type RoadmapContent = z.infer<typeof roadmapContentSchema>;
