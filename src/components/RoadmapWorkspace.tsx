"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; name: string; _count: { positions: number } };
type Position = { id: string; title: string; description: string; skills: { importanceWeight: number; isRequired: boolean; skill: { name: string } }[] };
type Analysis = { id: string; status: string; createdAt: string; uploadedFile?: { originalFilename: string } | null; recommendations: { matchScore: number; jobPosition: { id: string; title: string } }[] };
type RoadmapRow = { id: string; status: string; durationMonths: number; weeklyStudyHours: number; createdAt: string; careerAnalysis: { uploadedFile: { originalFilename: string } | null } | null; targetJobPosition: { title: string; category: { name: string } }; items: { status: string; estimatedHours: number }[] };
type Mode = "analysis" | "manual";

// Data fetched on the server so the form is usable on first paint instead of
// showing "Memuat katalog..." while three round trips finish.
export type InitialData = {
  categories: Category[];
  positions: Position[];
  analyses: Analysis[];
  history: RoadmapRow[];
};

const durations = [1, 3, 6, 12];
const weeklyHours = [5, 10, 20];

export function RoadmapWorkspace({ initial }: { initial?: InitialData }) {
  const [categories, setCategories] = useState<Category[]>(initial?.categories ?? []);
  const [positions, setPositions] = useState<Position[]>(initial?.positions ?? []);
  const [analyses, setAnalyses] = useState<Analysis[]>(initial?.analyses ?? []);
  const [history, setHistory] = useState<RoadmapRow[]>(initial?.history ?? []);
  const [categoryId, setCategoryId] = useState(initial?.categories?.[0]?.id ?? "");
  const [positionId, setPositionId] = useState(initial?.positions?.[0]?.id ?? "");
  const [duration, setDuration] = useState(3);
  const [hours, setHours] = useState(10);
  const [mode, setMode] = useState<Mode>(initial?.analyses?.length ? "analysis" : "manual");
  const [analysisId, setAnalysisId] = useState(initial?.analyses?.[0]?.id ?? "");
  const [manualSkills, setManualSkills] = useState("");
  const [preferences, setPreferences] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Server-rendered data means there is nothing to wait for on first paint.
  const [loading, setLoading] = useState(!initial);

  // Only reached when the page was opened without server data (for example a
  // hard refresh straight onto a client transition).
  useEffect(() => {
    if (initial) return;
    (async () => {
      try {
        const [categoryRes, analysisRes, historyRes] = await Promise.all([
          fetch("/api/job-categories"), fetch("/api/career-analysis"), fetch("/api/roadmaps"),
        ]);
        if (categoryRes.ok) {
          const list: Category[] = (await categoryRes.json()).categories;
          setCategories(list);
          setCategoryId(current => current || list[0]?.id || "");
        }
        if (analysisRes.ok) {
          const completed: Analysis[] = (await analysisRes.json()).analyses.filter((item: Analysis) => item.status === "completed");
          setAnalyses(completed);
          if (completed.length) { setMode("analysis"); setAnalysisId(completed[0].id); }
        }
        if (historyRes.ok) setHistory((await historyRes.json()).roadmaps);
      } catch { setError("Gagal memuat data awal. Muat ulang halaman."); }
      finally { setLoading(false); }
    })();
  }, [initial]);

  // The positions for the first category come from the server too. This effect
  // only runs when the user switches category.
  const loadedCategory = useRef(initial?.categories?.[0]?.id ?? "");
  useEffect(() => {
    if (!categoryId) { setPositions([]); setPositionId(""); return; }
    if (categoryId === loadedCategory.current) return;
    loadedCategory.current = categoryId;
    (async () => {
      const response = await fetch(`/api/job-positions?categoryId=${encodeURIComponent(categoryId)}`);
      if (!response.ok) return;
      const list: Position[] = (await response.json()).positions;
      setPositions(list);
      setPositionId(list[0]?.id ?? "");
    })().catch(() => undefined);
  }, [categoryId]);

  const selected = useMemo(() => positions.find(item => item.id === positionId), [positions, positionId]);
  const skills = useMemo(() => manualSkills.split(/[,;\n]/).map(item => item.trim()).filter(Boolean), [manualSkills]);
  const selectedAnalysis = useMemo(() => analyses.find(item => item.id === analysisId), [analyses, analysisId]);
  // Score for the position the user actually picked, not the top-ranked one.
  const selectedScore = useMemo(() => selectedAnalysis?.recommendations.find(item => item.jobPosition.id === positionId) ?? null, [selectedAnalysis, positionId]);

  async function create() {
    setError("");
    if (!positionId) { setError("Pilih posisi target terlebih dahulu."); return; }
    if (mode === "manual" && !skills.length) { setError("Isi minimal satu keterampilan awal, atau pilih hasil Career Analysis."); return; }
    if (mode === "analysis" && !analysisId) { setError("Pilih salah satu hasil analisis, atau gunakan input manual."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/roadmaps", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetJobPositionId: positionId,
          durationMonths: duration,
          weeklyStudyHours: hours,
          careerAnalysisId: mode === "analysis" ? analysisId : null,
          manualSkills: mode === "manual" ? skills : [],
          preferences,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Roadmap gagal dibuat.");
      window.location.href = `/dashboard/roadmap/${body.id}`;
    } catch (e) { setError(e instanceof Error ? e.message : "Roadmap gagal dibuat."); setBusy(false); }
  }

  if (loading) return <p className="p-10 text-secondary">Memuat katalog...</p>;

  return (
    <section className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold">AI Career Roadmap</h1>
        <p className="mt-2 text-secondary">Pilih posisi target, durasi, dan waktu belajar. Skill gap dihitung dari profil kamu, lalu rencana belajar dibagi per minggu.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Target dan kapasitas belajar</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block text-sm font-medium">Bidang
            <select className="mt-2 w-full rounded-lg border-border" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Pilih bidang</option>
              {categories.map(item => <option key={item.id} value={item.id}>{item.name} ({item._count.positions} posisi)</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Posisi target
            <select className="mt-2 w-full rounded-lg border-border" value={positionId} onChange={e => setPositionId(e.target.value)} disabled={!positions.length}>
              {positions.length ? positions.map(item => <option key={item.id} value={item.id}>{item.title}</option>) : <option value="">Pilih bidang dahulu</option>}
            </select>
          </label>
          <label className="block text-sm font-medium">Durasi
            <select className="mt-2 w-full rounded-lg border-border" value={duration} onChange={e => setDuration(Number(e.target.value))}>
              {durations.map(value => <option key={value} value={value}>{value} bulan</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Waktu belajar
            <select className="mt-2 w-full rounded-lg border-border" value={hours} onChange={e => setHours(Number(e.target.value))}>
              {weeklyHours.map(value => <option key={value} value={value}>{value} jam / minggu</option>)}
            </select>
          </label>
        </div>

        {selected && (
          <div className="mt-5 rounded-xl bg-background p-4 text-sm">
            <p className="font-medium">Kompetensi yang dinilai untuk {selected.title}</p>
            <p className="mt-1 text-secondary">{selected.skills.map(item => `${item.skill.name} (bobot ${item.importanceWeight}${item.isRequired ? ", wajib" : ""})`).join(" · ")}</p>
          </div>
        )}
        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="font-medium">Sumber profil skill</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode("analysis")} disabled={!analyses.length}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "analysis" ? "bg-lavender text-deep" : "bg-background text-secondary"} disabled:opacity-50`}>
              Hasil Career Analysis
            </button>
            <button type="button" onClick={() => setMode("manual")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "manual" ? "bg-lavender text-deep" : "bg-background text-secondary"}`}>
              Input manual
            </button>
          </div>
          {mode === "analysis" ? (
            analyses.length ? (
              <label className="mt-4 block text-sm font-medium">Profil CV yang dipakai
                <select className="mt-2 w-full rounded-lg border-border" value={analysisId} onChange={e => setAnalysisId(e.target.value)}>
                  {analyses.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.uploadedFile?.originalFilename ?? "CV tanpa nama"}
                      {" · "}{new Date(item.createdAt).toLocaleDateString("id-ID")}
                      {item.recommendations[0] ? ` · ${item.recommendations[0].matchScore}% ke ${item.recommendations[0].jobPosition.title}` : ""}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-secondary">Pilih CV yang profilnya ingin dijadikan dasar roadmap. Skill gap dihitung dari CV ini.</span>
              </label>
            ) : <p className="mt-3 text-sm text-secondary">Belum ada analisis selesai. Gunakan input manual, atau jalankan <Link className="font-semibold text-deep" href="/dashboard/analysis">Career Analysis</Link> dahulu.</p>
          ) : (
            <label className="mt-4 block text-sm font-medium">Keterampilan yang kamu miliki sekarang
              <textarea rows={3} className="mt-2 w-full rounded-lg border-border text-sm" placeholder="Contoh: Excel, SQL, Python, Tableau" value={manualSkills} onChange={e => setManualSkills(e.target.value)} />
              <span className="mt-1 block text-xs text-secondary">Pisahkan dengan koma. {skills.length} keterampilan terbaca.</span>
            </label>
          )}
          <label className="mt-4 block text-sm font-medium">Preferensi tambahan (opsional)
            <input className="mt-2 w-full rounded-lg border-border text-sm" maxLength={300} placeholder="Contoh: belajar malam hari, lebih suka proyek nyata" value={preferences} onChange={e => setPreferences(e.target.value)} />
          </label>
        </div>

        {error && <p role="alert" className="mt-5 rounded-lg bg-pink p-4 text-sm">{error}</p>}
        {mode === "analysis" && selected && selectedScore && selectedScore.matchScore >= 100 && (
          <p className="mt-5 rounded-lg bg-yellow p-4 text-sm">
            CV ini sudah mendapat skor 100% untuk {selected.title}. Semua kompetensi katalog posisi ini sudah terpenuhi, jadi tidak ada skill gap yang bisa dijadwalkan. Pilih posisi target lain yang kompetensinya belum kamu miliki.
          </p>
        )}
        <button className="mt-6 rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={create}>
          {busy ? "Menyusun roadmap..." : "Buat roadmap"}
        </button>
        <p className="mt-3 text-xs text-secondary">Kapasitas dihitung dari durasi × jam per minggu. Kompetensi yang tidak muat ditandai belum tercakup, bukan dipadatkan.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Roadmap milikmu</h2>
        {history.length ? (
          <ul className="mt-4 space-y-3">
            {history.map(item => {
              const done = item.items.filter(entry => entry.status === "completed").length;
              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{item.careerAnalysis?.uploadedFile?.originalFilename ?? "Input manual"}</p>
                    <p className="text-sm text-secondary">{item.targetJobPosition.title} · {item.targetJobPosition.category.name} · {item.durationMonths} bulan · {item.weeklyStudyHours} jam/minggu · {done}/{item.items.length} selesai</p>
                  </div>
                  <Link className="font-semibold text-deep" href={`/dashboard/roadmap/${item.id}`}>Lihat progres</Link>
                </li>
              );
            })}
          </ul>
        ) : <p className="mt-3 text-secondary">Belum ada roadmap. Buat yang pertama di atas.</p>}
      </div>
    </section>
  );
}
