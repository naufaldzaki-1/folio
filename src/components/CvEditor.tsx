"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cvContentSchema, cvSectionLabels, type CvContent, type CvEntry, type CvSectionKey } from "@/lib/cv/schema";
import { CvFormFields } from "@/components/CvFormFields";
import { CvPreview } from "@/components/CvPreview";

type Template = { id: string; name: string; description: string | null; templateConfigJson: { accent?: string; headingStyle?: string } };
type Document = { id: string; title: string; status: string; templateId: string; generatedFileKey: string | null; structuredContentJson: CvContent; template: Template };

export function CvEditor({ id }: { id: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [document, setDocument] = useState<Document | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [content, setContent] = useState<CvContent | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [suggestion, setSuggestion] = useState<{ text: string; target: string; entryId?: string } | null>(null);
  const [assistTarget, setAssistTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadVersion, setDownloadVersion] = useState(Date.now());

  useEffect(() => {
    fetch(`/api/cv-documents/${encodeURIComponent(id)}`)
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setDocument(body.document);
        setTemplates(body.templates);
        setTitle(body.document.title);
        setTemplateId(body.document.templateId);
        // A draft saved before a schema change may be incomplete. Fail with a
        // readable message instead of dumping raw Zod issues into the UI.
        const parsed = cvContentSchema.safeParse(body.document.structuredContentJson);
        if (!parsed.success) throw new Error("Isi dokumen CV belum lengkap atau tidak sesuai format terbaru. Buat dokumen baru dari halaman CV Builder.");
        setContent(parsed.data);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Dokumen CV tidak dapat dimuat."))
      .finally(() => setLoading(false));
  }, [id]);

  const config = useMemo(() => templates.find(item => item.id === templateId)?.templateConfigJson ?? {}, [templates, templateId]);

  if (loading) return <p className="p-10 text-secondary">Memuat dokumen CV...</p>;
  if (!document || !content) return <p role="alert" className="p-10">{error || "Dokumen CV tidak ditemukan."}</p>;

  function move(key: CvSectionKey, direction: -1 | 1) {
    if (!content) return;
    const order = [...content.sectionOrder];
    const index = order.indexOf(key);
    const next = index + direction;
    if (next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next], order[index]];
    setContent({ ...content, sectionOrder: order });
  }

  async function save() {
    if (!content) return;
    setBusy("save"); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cv-documents/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, templateId, content }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Gagal menyimpan dokumen.");
      setNotice("Draft tersimpan. Ekspor PDF lagi jika sudah yakin.");
      setDocument(current => current ? { ...current, generatedFileKey: null, status: "draft", title } : current);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal menyimpan dokumen."); }
    finally { setBusy(""); }
  }

  async function exportPdf() {
    if (!content) return;
    setBusy("export"); setError(""); setNotice("");
    try {
      // Pastikan data tersimpan dulu ke database sebelum diekspor
      const saveRes = await fetch(`/api/cv-documents/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, templateId, content }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json();
        throw new Error(body.error ?? "Gagal menyimpan perubahan sebelum ekspor.");
      }

      const response = await fetch(`/api/cv-documents/${id}/export`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Ekspor PDF gagal.");
      setDownloadVersion(Date.now());
      setNotice("PDF baru berhasil dibuat. Klik tombol \"Unduh PDF\" untuk membukanya.");
      setDocument(current => current ? { ...current, generatedFileKey: "exported", status: "exported", title } : current);
    } catch (e) { setError(e instanceof Error ? e.message : "Ekspor PDF gagal."); }
    finally { setBusy(""); }
  }

  async function askAi(target: "summary" | "experience" | "project", entryId?: string) {
    if (!content) return;
    setBusy("ai"); setError(""); setNotice(""); setSuggestion(null);
    try {
      const response = await fetch(`/api/cv-documents/${id}/generate-content`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, entryId, role: content.contact.headline }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Bantuan AI gagal.");
      setSuggestion({ text: body.suggestion.text, target, entryId });
      setNotice("Saran AI siap. Periksa dulu: pastikan tidak ada fakta yang tidak kamu tulis sendiri, lalu klik \"Pakai saran ini\".");
    } catch (e) { setError(e instanceof Error ? e.message : "Bantuan AI gagal."); }
    finally { setBusy(""); }
  }

  function applySuggestion() {
    if (!content || !suggestion) return;
    if (suggestion.target === "summary") setContent({ ...content, summary: suggestion.text });
    else {
      const key: CvSectionKey = suggestion.target === "experience" ? "experience" : "projects";
      setContent({ ...content, [key]: (content[key] as CvEntry[]).map(item => item.id === suggestion.entryId ? { ...item, description: suggestion.text } : item) } as CvContent);
    }
    setSuggestion(null); setNotice("Saran dimasukkan ke dokumen. Jangan lupa simpan.");
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/cv-builder" className="text-deep">← Kembali ke CV Builder</Link>
          <h1 className="mt-2 text-3xl font-bold">{title || "Dokumen CV"}</h1>
          <p className="text-secondary">{document.template.name} · status {document.status}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-50" disabled={Boolean(busy)} onClick={save}>{busy === "save" ? "Menyimpan..." : "Simpan draft"}</button>
          <button className="rounded-lg bg-lavender px-4 py-2.5 font-semibold text-deep disabled:opacity-50" disabled={Boolean(busy)} onClick={exportPdf}>{busy === "export" ? "Mengekspor..." : "Ekspor PDF"}</button>
          {document.generatedFileKey && <a className="rounded-lg border border-border px-4 py-2.5 font-semibold" href={`/api/cv-documents/${id}/download?v=${downloadVersion}`} target="_blank" rel="noreferrer">Unduh PDF</a>}
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-pink p-4 text-sm">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-mint p-4 text-sm">{notice}</p>}

      <div className="flex gap-2">
        <button onClick={() => setTab("edit")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "edit" ? "bg-lavender text-deep" : "bg-white text-secondary"}`}>Editor</button>
        <button onClick={() => setTab("preview")} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "preview" ? "bg-lavender text-deep" : "bg-white text-secondary"}`}>Pratinjau</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-border bg-white p-6">
          {tab === "edit" ? (
            <>
              <label className="block text-sm font-medium">Judul dokumen
                <input className="mt-1 w-full rounded-lg border-border" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} />
              </label>
              <CvFormFields content={content} onChange={setContent} />
              <div className="mt-8 rounded-xl bg-background p-4">
                <p className="font-semibold">Bantuan AI (opsional)</p>
                <p className="mt-1 text-xs text-secondary">AI hanya merapikan fakta yang sudah kamu tulis. Ia tidak boleh menambah pengalaman, sertifikat, atau angka baru.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-deep disabled:opacity-50" disabled={Boolean(busy)} onClick={() => askAi("summary")}>
                    {busy === "ai" ? "Memproses..." : "Rapikan ringkasan"}
                  </button>
                  <select className="rounded-lg border-border text-xs" value={assistTarget} onChange={e => setAssistTarget(e.target.value)}>
                    <option value="">Pilih pengalaman/proyek</option>
                    {content.experience.map(item => <option key={item.id} value={`experience:${item.id}`}>Pengalaman: {item.title || "(belum diberi judul)"}</option>)}
                    {content.projects.map(item => <option key={item.id} value={`projects:${item.id}`}>Proyek: {item.title || "(belum diberi judul)"}</option>)}
                  </select>
                  <button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-deep disabled:opacity-50" disabled={Boolean(busy) || !assistTarget}
                    onClick={() => { const [kind, entryId] = assistTarget.split(":"); void askAi(kind === "experience" ? "experience" : "project", entryId); }}>
                    Rapikan deskripsi
                  </button>
                </div>
                {suggestion && (
                  <div className="mt-4 rounded-lg border border-border bg-white p-4">
                    <p className="text-sm whitespace-pre-line">{suggestion.text}</p>
                    <div className="mt-3 flex gap-3">
                      <button className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white" onClick={applySuggestion}>Pakai saran ini</button>
                      <button className="text-xs text-secondary hover:text-text" onClick={() => setSuggestion(null)}>Abaikan</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="overflow-x-auto bg-background p-4"><CvPreview content={content} config={config} /></div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="font-semibold">Template</p>
            <div className="mt-3 space-y-2">
              {templates.map(item => (
                <button key={item.id} onClick={() => setTemplateId(item.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${templateId === item.id ? "border-primary bg-lavender" : "border-border"}`}>
                  <span className="font-medium">{item.name}</span>
                  <span className="mt-1 block text-xs text-secondary">{item.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="font-semibold">Urutan bagian</p>
            <p className="mt-1 text-xs text-secondary">Ubah urutan tanpa mengubah isi.</p>
            <ul className="mt-3 space-y-2">
              {content.sectionOrder.map((key, index) => (
                <li key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{cvSectionLabels[key]}</span>
                  <span className="flex gap-1">
                    <button aria-label={`Naikkan ${cvSectionLabels[key]}`} disabled={index === 0} className="rounded px-2 py-1 text-xs disabled:opacity-30" onClick={() => move(key, -1)}>↑</button>
                    <button aria-label={`Turunkan ${cvSectionLabels[key]}`} disabled={index === content.sectionOrder.length - 1} className="rounded px-2 py-1 text-xs disabled:opacity-30" onClick={() => move(key, 1)}>↓</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="rounded-2xl bg-yellow p-4 text-xs">Periksa kembali isi CV sebelum dikirim. AI tidak menjamin CV diterima kerja, dan kamu tetap penanggung jawab akhir atas isi CV.</p>
        </aside>
      </div>
    </section>
  );
}

