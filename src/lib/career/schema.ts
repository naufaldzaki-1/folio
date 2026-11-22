import { z } from "zod";
import { ConfigError } from "@/lib/error-message";

// value may hold a merged entry (heading plus its bullet points), so it allows
// more text than a single short fact.
const evidence = z.object({ value: z.string().trim().min(1).max(600), evidence: z.string().trim().min(1).max(450) });
export const profileSchema = z.object({
  education: z.array(evidence).max(30),
  experience: z.array(evidence).max(40),
  projects: z.array(evidence).max(40),
  skills: z.array(evidence).max(100),
  certifications: z.array(evidence).max(40),
});
export type Profile = z.infer<typeof profileSchema>;

export const confirmedProfileSchema = profileSchema.extend({
  // Explicit user corrections are allowed even when they are absent from the original CV.
  confirmed: z.literal(true),
});

// LLMs commonly return a single string where the schema expects a list (or the
// reverse). Normalize both shapes so a valid insight is not discarded, while still
// rejecting free-form objects that cannot be traced to the calculated data.
const textItem = z.string().trim().min(1).max(300);
const asList = z.union([
  textItem,
  z.array(textItem).max(8),
  z.array(z.object({ value: textItem }).transform(item => item.value)).max(8),
]).transform(value => (Array.isArray(value) ? value : [value]));

export const insightSchema = z.object({
  profileSummary: z.union([z.string().trim().min(1).max(1400), z.array(textItem).max(8).transform(items => items.join(" "))]),
  strengths: asList,
  improvementAreas: asList,
  careerPotential: asList,
  cvEvaluation: asList,
});

export const maxUploadBytes = () => {
  const configured = Number(process.env.CV_MAX_BYTES ?? 5 * 1024 * 1024);
  if (!Number.isSafeInteger(configured) || configured < 1 || configured > 20 * 1024 * 1024) throw new ConfigError("CV_MAX_BYTES harus antara 1 dan 20971520.");
  return configured;
};