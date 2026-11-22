import { strict as assert } from "node:assert";
import { test } from "node:test";
import { insightSchema } from "../src/lib/career/schema";

test("normalizes string fields into arrays as returned by some OpenAI-compatible models", () => {
  const parsed = insightSchema.parse({
    profileSummary: "Profil mahasiswa informatika dengan pengalaman magang.",
    strengths: ["React", "SQL"],
    improvementAreas: "Belum ditemukan dalam CV: pengujian otomatis.",
    careerPotential: "Junior Frontend Developer berdasarkan skill katalog.",
    cvEvaluation: [{ value: "Bukti proyek tersedia, sertifikasi belum lengkap." }],
  });
  assert.deepEqual(parsed.improvementAreas, ["Belum ditemukan dalam CV: pengujian otomatis."]);
  assert.deepEqual(parsed.careerPotential, ["Junior Frontend Developer berdasarkan skill katalog."]);
  assert.deepEqual(parsed.cvEvaluation, ["Bukti proyek tersedia, sertifikasi belum lengkap."]);
});

test("rejects insight that cannot be traced to the analysis", () => {
  assert.throws(() => insightSchema.parse({ profileSummary: "", strengths: [], improvementAreas: [], careerPotential: [], cvEvaluation: [] }));
});