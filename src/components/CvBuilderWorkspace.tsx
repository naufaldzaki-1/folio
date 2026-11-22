"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { emptyCvContent, type CvContent } from "@/lib/cv/schema";
import { CvFormFields } from "@/components/CvFormFields";

type Template = { id: string; name: string; description: string | null; templateConfigJson: { accent?: string } };
type DocumentRow = { id: string; title: string; status: string; updatedAt: string; generatedFileKey: string | null; template: { name: string } };

// The blank editing state must NOT be validated: "Nama wajib diisi" is a rule for
// saving and exporting, not for opening the form. Validating here crashed the
// module before render, so the empty state is built without `parse`.
const emptyContent: CvContent = emptyCvContent();

// The form is the manual path required by PRD FR-CV-01. Data from a Career
// Analysis is offered as a suggestion the user can edit, never applied silently.
export function CvBuilderWorkspace() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [content, setContent] = useState<CvContent>(emptyContent);
  const [analyses, setAnalyses] = useState<{ id: string; createdAt: string }[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [templateRes, documentRes, analysisRes] = await Promise.all([
          fetch("/api/cv-templates"), fetch("/api/cv-documents"), fetch("/api/career-analysis"),
        ]);
        if (templateRes.ok) {
          const list: Template[] = (await templateRes.json()).templates;
          setTemplates(list);
          setTemplateId(list[0]?.id ?? "");
        }
        if (documentRes.ok) setDocuments((await documentRes.json()).documents);
        if (analysisRes.ok) setAnalyses((await analysisRes.json()).analyses.filter((item: { status: string }) => item.status === "completed"));
      } catch { setError("Gagal memuat data awal. Muat ulang halaman."); }
      finally { setLoading(false); }
    })();
  }, []);

  async function importFromAnalysis(analysisId: string) {
    setError(""); setNotice("");
    try {
      const response = await fetch(`/api/career-analysis/${analysisId}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const profile = body.analysis.careerProfile?.extractedProfileJson ?? body.analysis.sourceProfiles?.[0]?.extractedProfileJson;
      if (!profile) throw new Error("Profil analisis belum tersedia.");
      const entry = (items: { value: string }[], prefix: string, withDescription: boolean) =>
        items.map((item, index) => ({ id: `${prefix}-${index}`, title: item.value.slice(0, 160), organization: "", period: "", description: withDescription ? item.value : "" }));
      setContent(current => ({
        ...current,
        education: entry(profile.education ?? [], "edu", false),
        experience: entry(profile.experience ?? [], "exp", true),
        projects: entry(profile.projects ?? [], "prj", true),
        certifications: entry(profile.certifications ?? [], "crt", false),
        skills: (profile.skills ?? []).map((item: { value: string }) => item.value).slice(0, 60),
      }));
      setNotice("Data dari analisis dimasukkan sebagai titik awal. Rapikan setiap bagian; semua kolom masih bisa kamu ubah.");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal mengambil data analisis."); }
  }

  async function create() {
    setError(""); setNotice("");
    if (!title.trim()) { setError("Isi judul CV, misalnya \"CV Data Analyst 2026\"."); return; }
    if (!templateId) { setError("Pilih template CV."); return; }
    if (!content.contact.fullName.trim()) { setError("Nama lengkap wajib diisi pada bagian kontak."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/cv-documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, templateId, content }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Dokumen CV gagal dibuat.");
      window.location.href = `/dashboard/cv-builder/${body.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Dokumen CV gagal dibuat."); setBusy(false); }
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/cv-documents/${id}`, { method: "DELETE" });
    if (!response.ok) { setError((await response.json()).error ?? "Gagal menghapus dokumen."); return; }
    setDocuments(list => list.filter(item => item.id !== id));
    setNotice("Dokumen CV dihapus.");
  }

  if (loading) return <p className="p-10 text-secondary">Memuat template CV...</p>;

  return (
    <section className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold">AI CV Builder</h1>
        <p className="mt-2 text-secondary">Isi data dari kamu sendiri, pilih template, dan unduh PDF. AI hanya merapikan kalimat dari fakta yang kamu tulis.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Mulai CV baru</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium">Judul dokumen
            <input className="mt-2 w-full rounded-lg border-border" maxLength={120} placeholder="CV Data Analyst 2026" value={title} onChange={e => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Template
            <select className="mt-2 w-full rounded-lg border-border" value={templateId} onChange={e => setTemplateId(e.target.value)}>
              {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <span className="mt-1 block text-xs text-secondary">{templates.find(item => item.id === templateId)?.description}</span>
          </label>
        </div>

        {analyses.length > 0 && (
          <div className="mt-5 rounded-xl bg-background p-4">
            <p className="text-sm font-medium">Isi otomatis dari hasil analisis (opsional)</p>
            <p className="mt-1 text-xs text-secondary">Data dimasukkan sebagai draf awal. Periksa dan ubah setiap bagian sebelum disimpan.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {analyses.map(item => (
                <button key={item.id} type="button" onClick={() => importFromAnalysis(item.id)}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-deep hover:bg-lavender">
                  Analisis {new Date(item.createdAt).toLocaleDateString("id-ID")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-pink p-4 text-sm">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-mint p-4 text-sm">{notice}</p>}

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Data CV</h2>
        <p className="mt-1 text-sm text-secondary">Semua bagian bisa diisi tanpa menjalankan Career Analysis atau Roadmap.</p>
        <CvFormFields content={content} onChange={setContent} />
        <button className="mt-6 rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={create}>
          {busy ? "Menyimpan..." : "Simpan dan buka editor"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Dokumen CV milikmu</h2>
        {documents.length ? (
          <ul className="mt-4 space-y-3">
            {documents.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-secondary">{item.template.name} · {item.status} · diperbarui {new Date(item.updatedAt).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-4">
                  {item.generatedFileKey && <a className="text-sm font-semibold text-deep" href={`/api/cv-documents/${item.id}/download`} target="_blank" rel="noreferrer">Buka PDF</a>}
                  <Link className="font-semibold text-deep" href={`/dashboard/cv-builder/${item.id}`}>Edit</Link>
                  <button className="text-sm text-secondary hover:text-text" onClick={() => remove(item.id)}>Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-secondary">Belum ada dokumen CV.</p>}
      </div>
    </section>
  );
}
