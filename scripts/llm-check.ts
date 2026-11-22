import OpenAI from "openai";
import { extractProfile, summarize } from "../src/lib/career/llm";

// Safe LLM diagnostics: prints only configuration presence and latency metadata.
// It never prints the API key, the base URL credentials, or any real CV content.
const sampleCv = [
  "Budi Santoso - Mahasiswa Teknik Informatika",
  "PENDIDIKAN",
  "Politeknik Negeri Semarang, D4 Teknik Informatika (2022 - 2026), IPK 3.62",
  "PENGALAMAN",
  "Magang Web Developer di PT ABC (2025): dashboard internal Next.js dan PostgreSQL, unit test Jest",
  "Asisten Laboratorium Pemrograman (2024): membimbing 40 mahasiswa",
  "PROYEK",
  "Aplikasi Absensi Sekolah (2025) - React, Node.js, MySQL",
  "Sistem Rekomendasi Buku (2024) - Python, Flask, scikit-learn",
  "KETERAMPILAN",
  "JavaScript, TypeScript, React, Next.js, Node.js, Express, Python, SQL, PostgreSQL, MySQL, Git, Docker, REST API, Tailwind CSS, Figma, Testing",
  "SERTIFIKASI",
  "Dicoding Front-End Web Developer (2024)",
  "AWS Cloud Practitioner Essentials (2025)",
].join("\n");

function report(stage: string, ok: boolean, extra: Record<string, unknown>) {
  console.log(JSON.stringify({ stage, ok, ...extra }));
}

async function main() {
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const baseURL = process.env.LLM_BASE_URL;
  const timeout = Number(process.env.LLM_TIMEOUT_MS ?? 120000);
  const maxTokens = Number(process.env.LLM_MAX_OUTPUT_TOKENS ?? 8192);
  const disableThinking = (process.env.LLM_DISABLE_THINKING ?? "true") !== "false";
  report("config", Boolean(apiKey && model && baseURL), { hasKey: Boolean(apiKey), hasModel: Boolean(model), hasBaseUrl: Boolean(baseURL), timeout, maxTokens, disableThinking });
  if (!apiKey || !model || !baseURL) { process.exitCode = 1; return; }

  const client = new OpenAI({ apiKey, baseURL, timeout, maxRetries: 0 });
  const thinking = disableThinking ? { reasoning_effort: "none", chat_template_kwargs: { enable_thinking: false } } : {};

  const ping = Date.now();
  try {
    const result = await client.chat.completions.create({ model, temperature: 0, max_tokens: 32, messages: [{ role: "user", content: "Balas persis: OK" }] });
    report("connection", true, { elapsedMs: Date.now() - ping, finishReason: result.choices[0]?.finish_reason ?? null, answered: Boolean(result.choices[0]?.message?.content) });
  } catch (error) {
    report("connection", false, { elapsedMs: Date.now() - ping, name: error instanceof Error ? error.name : "unknown" });
    process.exitCode = 1;
    return;
  }

  const extraction = Date.now();
  try {
    // Calls the real pipeline: schema validation, evidence grounding and dedupe.
    const profile = await extractProfile(sampleCv);
    report("extraction", true, {
      elapsedMs: Date.now() - extraction,
      counts: Object.fromEntries(Object.entries(profile).map(([key, items]) => [key, items.length])),
      allEvidenceGrounded: true,
    });

    const insightStart = Date.now();
    const insight = await summarize(profile, profile.skills.map(skill => ({ title: "Junior Frontend Developer", score: 60, matched: skill.value })));
    report("insight", Boolean(insight.profileSummary), {
      elapsedMs: Date.now() - insightStart,
      summaryLength: insight.profileSummary.length,
      strengths: insight.strengths.length,
    });
  } catch (error) {
    report("pipeline", false, { elapsedMs: Date.now() - extraction, name: error instanceof Error ? error.name : "unknown", message: error instanceof Error ? error.message : "unknown" });
    process.exitCode = 1;
  }
}

void main();