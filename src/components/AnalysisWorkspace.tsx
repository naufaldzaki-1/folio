"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/career/schema";
import { normalizeProfile } from "@/lib/career/profile";
import { requestJson } from "@/lib/client-fetch";

type Item = { id: string; status: string; createdAt: string; uploadedFile?: { originalFilename: string } | null; recommendations: { matchScore: number; jobPosition: { title: string } }[] };
type Entry = { value: string; evidence: string };
const categories: (keyof Profile)[] = ["education", "experience", "projects", "skills", "certifications"];
const labels: Record<keyof Profile, string> = { education: "Pendidikan", experience: "Pengalaman", projects: "Proyek", skills: "Keterampilan", certifications: "Sertifikasi" };
const hints: Record<keyof Profile, string> = {
  education: "Satu baris per institusi.",
  experience: "Satu baris per posisi, boleh memuat ringkasan tugas.",
  projects: "Satu baris per proyek, boleh memuat teknologi dan hasil.",
  skills: "Satu baris per skill, misalnya React atau SQL.",
  certifications: "Satu baris per sertifikat.",
};

export function AnalysisWorkspace() {
  const [history, setHistory] = useState<Item[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [id, setId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const send = <T,>(url: string, options: RequestInit) => requestJson<T>(url, options);
  async function refresh() {
    try {
      const body = await requestJson<{ analyses: Item[] }>("/api/career-analysis");
      setHistory(body.analyses);
    } catch {
      // History is a convenience list; a failed refresh must not overwrite the
      // profile the visitor is editing with an error banner.
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function resume(analysisId: string) {
    setError("");
    try {
      const result = await send<{ analysis: { sourceProfiles?: { extractedProfileJson?: unknown }[] } }>(`/api/career-analysis/${analysisId}`, { method: "GET" });
      const draft = result.analysis.sourceProfiles?.[0]?.extractedProfileJson as Profile | undefined;
      if (!draft) throw new Error("Profil draft tidak tersedia.");
      setId(analysisId);
      setProfile(normalizeProfile(draft));
      setNotice("Draft dimuat. Periksa profil sebelum menjalankan analisis.");
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memuat draft."); }
  }

  async function upload() {
    if (!file) { setError("Pilih file terlebih dahulu."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await send<{ id: string; profile: Profile }>("/api/career-analysis/upload", { method: "POST", body: data });
      setId(result.id);
      setProfile(normalizeProfile(result.profile));
      setNotice("Teks berhasil diekstrak. Periksa dan perbaiki semua bagian sebelum melanjutkan.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Upload gagal."); } finally { setBusy(false); }
  }

  async function confirm() {
    if (!profile) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const cleaned = normalizeProfile(profile);
      await send(`/api/career-analysis/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cleaned, confirmed: true }) });
      setNotice("Profil tersimpan. Sedang menghitung rekomendasi...");
      await send(`/api/career-analysis/${id}`, { method: "POST" });
      window.location.href = `/dashboard/analysis/${id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Analisis gagal."); setNotice(""); await refresh(); } finally { setBusy(false); }
  }

  function update(category: keyof Profile, index: number, patch: Partial<Entry>) {
    if (!profile) return;
    setProfile({ ...profile, [category]: profile[category].map((entry, i) => (i === index ? { ...entry, ...patch } : entry)) });
  }
  function remove(category: keyof Profile, index: number) {
    if (!profile) return;
    setProfile({ ...profile, [category]: profile[category].filter((_, i) => i !== index) });
  }
  function add(category: keyof Profile) {
    if (!profile) return;
    setProfile({ ...profile, [category]: [...profile[category], { value: "", evidence: "Ditambahkan pengguna" }] });
  }

  return (
    <section className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold">AI Career Analysis</h1>
        <p className="mt-2 text-secondary">Unggah CV PDF/DOCX, periksa ekstraksi, lalu dapatkan analisis berbasis katalog.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <label className="block font-semibold" htmlFor="cv">CV PDF atau DOCX (maksimal 5 MB secara default)</label>
        <input id="cv" className="mt-4 block w-full" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        <button className="mt-5 rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={upload}>
          {busy ? "Memproses..." : "Unggah dan ekstrak"}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-pink p-4 text-sm">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-mint p-4 text-sm">{notice}</p>}

      {profile && (
        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-xl font-semibold">Periksa profil hasil ekstraksi</h2>
          <p className="mt-2 text-sm text-secondary">Bukti berasal dari CV. Kamu boleh mengubah atau menambahkan fakta yang benar; jangan masukkan klaim fiktif.</p>
          {categories.map(category => (
            <div key={category} className="mt-6">
              <h3 className="font-semibold">{labels[category]}</h3>
              <p className="mt-1 text-xs text-secondary">{hints[category]}</p>
              <div className="mt-3 space-y-4">
                {profile[category].map((entry, index) => (
                  <div key={`${category}-${index}`} className="rounded-xl border border-border p-3">
                    <label className="text-xs font-medium text-secondary" htmlFor={`${category}-value-${index}`}>Isi</label>
                    <textarea
                      id={`${category}-value-${index}`}
                      rows={category === "skills" || category === "certifications" ? 1 : 2}
                      className="mt-1 w-full rounded-lg border-border text-sm"
                      value={entry.value}
                      onChange={e => update(category, index, { value: e.target.value })}
                    />
                    <label className="mt-2 block text-xs text-secondary" htmlFor={`${category}-evidence-${index}`}>Kutipan dari CV</label>
                    <input
                      id={`${category}-evidence-${index}`}
                      className="mt-1 w-full rounded-lg border-border text-xs text-secondary"
                      value={entry.evidence}
                      onChange={e => update(category, index, { evidence: e.target.value })}
                    />
                    <button className="mt-2 text-xs font-medium text-secondary hover:text-text" onClick={() => remove(category, index)}>Hapus</button>
                  </div>
                ))}
              </div>
              <button className="mt-3 text-sm font-medium text-deep" onClick={() => add(category)}>+ Tambahkan</button>
            </div>
          ))}
          <button className="mt-6 rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={confirm}>
            {busy ? "Memproses..." : "Konfirmasi dan analisis"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Riwayat milikmu</h2>
        {history.length ? (
          <ul className="mt-4 space-y-3">
            {history.map(item => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  {/* The CV filename is how users recognise their own profile. */}
                  <p className="font-medium">{item.uploadedFile?.originalFilename ?? "CV tanpa nama"}</p>
                  <p className="text-sm text-secondary">{new Date(item.createdAt).toLocaleDateString("id-ID")} · {item.status}{item.recommendations[0] ? ` · ${item.recommendations[0].jobPosition.title} (${item.recommendations[0].matchScore}%)` : " · Belum ada rekomendasi"}</p>
                </div>
                {item.status === "pending" || item.status === "failed"
                  ? <button className="font-semibold text-deep" onClick={() => resume(item.id)}>Periksa / coba lagi</button>
                  : <Link className="font-semibold text-deep" href={`/dashboard/analysis/${item.id}`}>Lihat</Link>}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-secondary">Belum ada analisis.</p>}
      </div>
    </section>
  );
}