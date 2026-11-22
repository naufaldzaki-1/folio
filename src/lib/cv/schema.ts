import { z } from "zod";

// A CV section is either a free paragraph (summary) or a list of entries. The
// user controls the order; the order array is the single source of truth so
// moving a section never rewrites its content.
export const cvSectionKeys = ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"] as const;
export type CvSectionKey = (typeof cvSectionKeys)[number];

export const cvSectionLabels: Record<CvSectionKey, string> = {
  summary: "Ringkasan profesional",
  education: "Pendidikan",
  experience: "Pengalaman kerja / magang",
  projects: "Proyek dan portofolio",
  skills: "Keterampilan",
  certifications: "Sertifikasi dan pelatihan",
  organizations: "Organisasi dan pengalaman tambahan",
};

const short = z.string().trim().max(160);
const body = z.string().trim().max(1200);

export const cvEntrySchema = z.object({
  // `id` keeps React keys stable while entries are reordered or edited.
  id: z.string().trim().min(1).max(64),
  title: short,          // degree, job title, project name, certification name
  organization: short,   // campus, company, issuer, organization
  // Rendered as "Institution - Location" on one line, as the locked format
  // requires. Optional so existing saved documents keep validating.
  location: short.optional(),
  period: z.string().trim().max(60), // "2022 - 2026", "Feb 2025"
  description: body,     // responsibilities / project detail
});
export type CvEntry = z.infer<typeof cvEntrySchema>;

export const cvContactSchema = z.object({
  fullName: z.string().trim().min(2, "Nama wajib diisi.").max(120),
  headline: z.string().trim().max(140),
  email: z.string().trim().max(160),
  phone: z.string().trim().max(40),
  location: z.string().trim().max(120),
  links: z.array(z.string().trim().min(1).max(200)).max(5),
});

export const cvContentSchema = z.object({
  contact: cvContactSchema,
  summary: z.string().trim().max(1400),
  education: z.array(cvEntrySchema).max(12),
  experience: z.array(cvEntrySchema).max(15),
  projects: z.array(cvEntrySchema).max(15),
  skills: z.array(z.string().trim().min(1).max(80)).max(60),
  certifications: z.array(cvEntrySchema).max(20),
  organizations: z.array(cvEntrySchema).max(12),
  sectionOrder: z.array(z.enum(cvSectionKeys)).min(1).max(cvSectionKeys.length),
});
export type CvContent = z.infer<typeof cvContentSchema>;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "ID tidak valid.");

export const cvDocumentInputSchema = z.object({
  title: z.string().trim().min(2, "Judul CV wajib diisi.").max(120),
  templateId: uuid,
  content: cvContentSchema,
});

export const cvAssistSchema = z.object({
  target: z.enum(["summary", "experience", "project"]),
  // The entry being rewritten. Only user-provided text may be echoed back.
  entryId: z.string().trim().max(64).optional(),
  role: z.string().trim().max(160).default(""),
});

// The model may only rephrase facts given in the request.
export const cvAssistResultSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  usedFacts: z.array(z.string().trim().min(1).max(200)).min(1).max(12),
});
export type CvAssistResult = z.infer<typeof cvAssistResultSchema>;

export function emptyCvContent(fullName = ""): CvContent {
  return {
    contact: { fullName, headline: "", email: "", phone: "", location: "", links: [] },
    summary: "",
    education: [], experience: [], projects: [], certifications: [], organizations: [],
    skills: [],
    sectionOrder: ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"],
  };
}
