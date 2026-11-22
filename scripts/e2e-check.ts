import { readFileSync } from "node:fs";

// End-to-end check against a running server (npm run build && npm start).
// It walks the full PRD §18 flow as a brand new user and also verifies data
// isolation between two accounts. Usage:
//   npm run e2e:check -- <pdfPath> [docxPath]
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const pdfPath = process.argv[2];
const docxPath = process.argv[3];
if (!pdfPath) throw new Error("Sebutkan path PDF CV sebagai argumen pertama.");

type Jar = Map<string, string>;
const results: { step: string; ok: boolean; detail?: unknown }[] = [];
function record(step: string, ok: boolean, detail?: unknown) {
  results.push({ step, ok, detail });
  console.log(JSON.stringify({ step, ok, ...(detail ? { detail } : {}) }));
}

function cookieHeader(jar: Jar) {
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}
function absorb(jar: Jar, response: Response) {
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}
async function call(jar: Jar, path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...(init.headers ?? {}), cookie: cookieHeader(jar) } });
  absorb(jar, response);
  const type = response.headers.get("content-type") ?? "";
  const body = type.includes("application/json") ? await response.json() : await response.arrayBuffer();
  return { status: response.status, body, headers: response.headers };
}
async function register(jar: Jar, label: string) {
  const email = `${label}-${Date.now()}@example.test`;
  const response = await call(jar, "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: label, email, password: "rahasia12345" }) });
  return { email, status: response.status };
}
async function login(jar: Jar, email: string) {
  return call(jar, "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "rahasia12345" }) });
}
async function upload(jar: Jar, path: string, name: string) {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(path)], { type: name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), name);
  return call(jar, "/api/career-analysis/upload", { method: "POST", body: form });
}

async function main() {
  const owner: Jar = new Map();
  const registration = await register(owner, "owner");
  record("register", registration.status === 200, { email: registration.email });

  const uploadPdf = await upload(owner, pdfPath, "cv.pdf");
  record("upload-pdf", uploadPdf.status === 201, { status: uploadPdf.status, profileKeys: uploadPdf.status === 201 ? Object.keys(uploadPdf.body.profile) : uploadPdf.body });
  if (uploadPdf.status !== 201) return;
  const analysisId = uploadPdf.body.id;

  // Rejections required by FR-CA-02.
  const badFile = new FormData();
  badFile.append("file", new Blob([Buffer.from("bukan pdf")], { type: "text/plain" }), "catatan.txt");
  const rejected = await call(owner, "/api/career-analysis/upload", { method: "POST", body: badFile });
  record("reject-unsupported-file", rejected.status === 400, rejected.body);

  if (docxPath) {
    const docxJar: Jar = new Map();
    await register(docxJar, "docx");
    const uploadDocx = await upload(docxJar, docxPath, "cv.docx");
    record("upload-docx", uploadDocx.status === 201, { status: uploadDocx.status });
    if (uploadDocx.status === 201) {
      const confirm = await call(docxJar, `/api/career-analysis/${uploadDocx.body.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...uploadDocx.body.profile, confirmed: true }) });
      record("confirm-docx-profile", confirm.status === 200, confirm.body);
      const run = await call(docxJar, `/api/career-analysis/${uploadDocx.body.id}`, { method: "POST" });
      record("analyse-docx", run.status === 200, run.body);
    }
  }

  const confirm = await call(owner, `/api/career-analysis/${analysisId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...uploadPdf.body.profile, confirmed: true }) });
  record("confirm-profile", confirm.status === 200, confirm.body);
  const analyse = await call(owner, `/api/career-analysis/${analysisId}`, { method: "POST" });
  record("analyse-pdf", analyse.status === 200, analyse.body);
  const detail = await call(owner, `/api/career-analysis/${analysisId}`);
  const recommendations = detail.body?.analysis?.recommendations ?? [];
  record("analysis-result", detail.status === 200 && recommendations.length > 0, {
    status: detail.body?.analysis?.status,
    top: recommendations.slice(0, 3).map((item: { jobPosition: { title: string }; matchScore: number }) => `${item.jobPosition.title} ${item.matchScore}%`),
    hasInsight: Boolean(detail.body?.analysis?.insights?.length),
    hasBreakdown: Boolean(recommendations[0]?.scoreBreakdownJson),
  });

  const categories = await call(owner, "/api/job-categories");
  record("job-categories", categories.status === 200 && categories.body.categories.length > 0, { count: categories.body?.categories?.length });
  const positions = await call(owner, `/api/job-positions?categoryId=${categories.body.categories[0].id}`);
  const targetId = positions.body.positions[0].id;

  const roadmap = await call(owner, "/api/roadmaps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetJobPositionId: targetId, durationMonths: 3, weeklyStudyHours: 10, careerAnalysisId: analysisId, manualSkills: [], preferences: "" }) });
  record("roadmap-create", roadmap.status === 201, roadmap.body);
  if (roadmap.status === 201) {
    const roadmapId = roadmap.body.id;
    const roadmapDetail = await call(owner, `/api/roadmaps/${roadmapId}`);
    const items = roadmapDetail.body.roadmap.items;
    record("roadmap-detail", roadmapDetail.status === 200 && items.length > 0, { items: items.length, gaps: roadmapDetail.body.roadmap.roadmapJson.gaps.length, notes: roadmapDetail.body.roadmap.roadmapJson.notes.length });
    const progress = await call(owner, `/api/roadmaps/${roadmapId}/items/${items[0].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) });
    const after = await call(owner, `/api/roadmaps/${roadmapId}`);
    record("roadmap-progress", progress.status === 200 && after.body.roadmap.items[0].status === "completed", { status: after.body.roadmap.status });
  }

  const templates = await call(owner, "/api/cv-templates");
  record("cv-templates", templates.status === 200 && templates.body.templates.length >= 2, { count: templates.body?.templates?.length });
  const cvBody = {
    title: "CV E2E",
    templateId: templates.body.templates[0].id,
    content: {
      contact: { fullName: "Nama E2E", headline: "Data Analyst", email: "e2e@example.test", phone: "0812", location: "Semarang", links: [] },
      summary: "", education: [{ id: "edu-1", title: "S1 Statistika", organization: "Universitas Uji", period: "2022 - 2026", description: "" }],
      experience: [{ id: "exp-1", title: "Magang Analis", organization: "PT Uji", period: "2025", description: "Membuat dashboard penjualan bulanan dengan SQL dan Excel" }],
      projects: [], certifications: [], organizations: [], skills: ["SQL", "Excel"],
      sectionOrder: ["summary", "education", "experience", "projects", "skills", "certifications", "organizations"],
    },
  };
  const cv = await call(owner, "/api/cv-documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cvBody) });
  record("cv-create", cv.status === 201, cv.body);
  if (cv.status === 201) {
    const cvId = cv.body.id;
    const assist = await call(owner, `/api/cv-documents/${cvId}/generate-content`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: "experience", entryId: "exp-1", role: "Data Analyst" }) });
    record("cv-ai-assist", assist.status === 200 && Boolean(assist.body.suggestion?.text), { length: assist.body?.suggestion?.text?.length, usedFacts: assist.body?.suggestion?.usedFacts?.length });
    const exported = await call(owner, `/api/cv-documents/${cvId}/export`, { method: "POST" });
    record("cv-export", exported.status === 200, exported.body);
    const download = await call(owner, `/api/cv-documents/${cvId}/download`);
    const bytes = Buffer.from(download.body as ArrayBuffer);
    record("cv-download-pdf", download.status === 200 && bytes.subarray(0, 5).toString() === "%PDF-", { bytes: bytes.byteLength });

    // Isolation: a second account must not reach the first account's resources.
    const intruder: Jar = new Map();
    await register(intruder, "intruder");
    const foreignAnalysis = await call(intruder, `/api/career-analysis/${analysisId}`);
    const foreignCv = await call(intruder, `/api/cv-documents/${cvId}`);
    const foreignDownload = await call(intruder, `/api/cv-documents/${cvId}/download`);
    record("isolation", foreignAnalysis.status === 404 && foreignCv.status === 404 && foreignDownload.status === 404, { foreignAnalysis: foreignAnalysis.status, foreignCv: foreignCv.status, foreignDownload: foreignDownload.status });

    // History survives a logout/login round trip and stays scoped to the account.
    await call(owner, "/api/auth/logout", { method: "POST" });
    owner.clear();
    const relogin = await login(owner, registration.email);
    const history = await call(owner, "/api/career-analysis");
    const roadmapHistory = await call(owner, "/api/roadmaps");
    const cvHistory = await call(owner, "/api/cv-documents");
    record("relogin-history", relogin.status === 200 && history.body.analyses.length > 0 && roadmapHistory.body.roadmaps.length > 0 && cvHistory.body.documents.length > 0, {
      analyses: history.body?.analyses?.length, roadmaps: roadmapHistory.body?.roadmaps?.length, documents: cvHistory.body?.documents?.length,
    });
    const unauthenticated = await fetch(`${base}/api/career-analysis`);
    record("unauthorised-blocked", unauthenticated.status === 401, { status: unauthenticated.status });
  }

  const failed = results.filter(item => !item.ok);
  console.log(JSON.stringify({ summary: { total: results.length, passed: results.length - failed.length, failed: failed.map(item => item.step) } }));
  if (failed.length) process.exitCode = 1;
}

main().catch(error => {
  console.log(JSON.stringify({ step: "fatal", ok: false, message: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
});

