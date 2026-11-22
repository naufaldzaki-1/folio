"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Gap = { skillId: string; name: string; status: "owned" | "improve" | "missing"; priority: string; importanceWeight: number; isRequired: boolean; reason: string; evidence: string; estimatedHours: number; covered: boolean };
type Snapshot = { targetPosition: { title: string; category: string }; source: { kind: string; label?: string; note: string }; capacity: { durationMonths: number; weeklyStudyHours: number; totalWeeks: number; capacityHours: number; requiredHours: number; coveredHours: number; leftoverWeeks: number }; gaps: Gap[]; notes: string[] };
type Item = { id: string; title: string; description: string; periodNumber: number; estimatedHours: number; expectedOutcome: string; status: string };
type Roadmap = { id: string; status: string; durationMonths: number; weeklyStudyHours: number; roadmapJson: Snapshot; items: Item[]; targetJobPosition: { title: string; category: { name: string } } };

const statusLabel: Record<string, string> = { not_started: "Belum dimulai", in_progress: "Sedang berlangsung", completed: "Selesai" };
const gapLabel: Record<Gap["status"], string> = { owned: "Sudah dimiliki", improve: "Perlu ditingkatkan", missing: "Belum ditemukan" };

export function RoadmapDetail({ id }: { id: string }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    fetch(`/api/roadmaps/${encodeURIComponent(id)}`)
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setRoadmap(body.roadmap); })
      .catch(e => setError(e instanceof Error ? e.message : "Roadmap tidak dapat dimuat."))
      .finally(() => setLoading(false));
  }, [id]);

  const progress = useMemo(() => {
    if (!roadmap) return { done: 0, total: 0, hours: 0 };
    return {
      done: roadmap.items.filter(item => item.status === "completed").length,
      total: roadmap.items.length,
      hours: roadmap.items.filter(item => item.status === "completed").reduce((sum, item) => sum + item.estimatedHours, 0),
    };
  }, [roadmap]);

  async function setStatus(item: Item, status: string) {
    setSaving(item.id); setError("");
    try {
      const response = await fetch(`/api/roadmaps/${id}/items/${item.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Status gagal disimpan.");
      setRoadmap(current => current ? {
        ...current,
        status: body.completed ? "completed" : "active",
        items: current.items.map(entry => entry.id === item.id ? { ...entry, status: body.item.status } : entry),
      } : current);
    } catch (e) { setError(e instanceof Error ? e.message : "Status gagal disimpan."); }
    finally { setSaving(""); }
  }

  if (loading) return <p className="p-10 text-secondary">Memuat roadmap...</p>;
  if (error && !roadmap) return <p role="alert" className="p-10">{error}</p>;
  if (!roadmap) return <p className="p-10">Roadmap tidak ditemukan.</p>;

  const snapshot = roadmap.roadmapJson;
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="mx-auto max-w-5xl space-y-6 p-6 md:p-10">
      <Link href="/dashboard/roadmap" className="text-deep">← Kembali ke roadmap</Link>
      <div>
        <h1 className="text-3xl font-bold">{roadmap.targetJobPosition.title}</h1>
        <p className="mt-1 text-secondary">{snapshot.targetPosition.category} · {snapshot.capacity.durationMonths} bulan · {snapshot.capacity.weeklyStudyHours} jam/minggu</p>
      </div>

      <div className="rounded-xl bg-yellow p-4 text-sm">
        Roadmap ini rencana belajar, bukan jaminan siap kerja atau pasti diterima bekerja. Estimasi jam adalah perencanaan, bukan pengukuran hasil belajar.
      </div>

      {error && <p role="alert" className="rounded-lg bg-pink p-4 text-sm">{error}</p>}

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold">Progres</h2>
          <p className="text-2xl font-bold text-deep">{percent}%</p>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-lavender"><div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
        <p className="mt-3 text-sm text-secondary">{progress.done} dari {progress.total} aktivitas selesai · {progress.hours} jam tercatat · status roadmap: {roadmap.status === "completed" ? "selesai" : "aktif"}</p>
        <p className="mt-1 text-sm text-secondary">Kapasitas {snapshot.capacity.capacityHours} jam, kebutuhan kompetensi {snapshot.capacity.requiredHours} jam, tercakup {snapshot.capacity.coveredHours} jam.</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Skill gap analysis</h2>
        <p className="mt-1 text-sm font-medium">Sumber profil: {snapshot.source.label ?? (snapshot.source.kind === "analysis" ? "hasil Career Analysis" : "input manual")}</p>
        <p className="mt-1 text-sm text-secondary">{snapshot.source.note}</p>
        <p className="mt-2 text-xs text-secondary">Bukti penilaian ditampilkan per kompetensi. &quot;Belum ditemukan&quot; berarti tidak ada di data profil yang dipakai, bukan berarti kamu tidak mampu.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-secondary">
              <tr><th className="pb-2">Kompetensi</th><th className="pb-2">Status</th><th className="pb-2">Prioritas</th><th className="pb-2">Jam</th><th className="pb-2">Alasan dan bukti</th></tr>
            </thead>
            <tbody>
              {snapshot.gaps.map(gap => (
                <tr key={gap.skillId} className="border-t border-border align-top">
                  <td className="py-3 pr-3 font-medium">{gap.name}{gap.isRequired ? " (wajib)" : ""}<span className="block text-xs font-normal text-secondary">bobot {gap.importanceWeight}/5</span></td>
                  <td className="py-3 pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${gap.status === "owned" ? "bg-mint" : gap.status === "improve" ? "bg-yellow" : "bg-blue"}`}>
                      {gapLabel[gap.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-3">{gap.priority}{gap.covered ? <span className="block text-xs text-secondary">tercakup</span> : <span className="block text-xs text-secondary">belum tercakup</span>}</td>
                  <td className="py-3 pr-3">{gap.status === "owned" ? "—" : gap.estimatedHours}</td>
                  <td className="py-3 text-secondary">{gap.reason}<span className="mt-1 block text-xs">{gap.evidence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {snapshot.notes.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl bg-background p-4 text-sm text-secondary">
            {snapshot.notes.map(note => <li key={note}>{note}</li>)}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-xl font-semibold">Rencana per minggu</h2>
        <ul className="mt-4 space-y-3">
          {roadmap.items.map(item => (
            <li key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Minggu {item.periodNumber}</p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                </div>
                <span className="rounded-full bg-lavender px-3 py-1 text-xs font-medium text-deep">{item.estimatedHours} jam</span>
              </div>
              <p className="mt-2 text-sm text-secondary">{item.description}</p>
              <p className="mt-2 text-sm"><span className="font-medium">Hasil yang diharapkan: </span>{item.expectedOutcome}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(["not_started", "in_progress", "completed"] as const).map(status => (
                  <button key={status} disabled={saving === item.id} onClick={() => setStatus(item, status)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${item.status === status ? "bg-primary text-white" : "bg-background text-secondary hover:text-text"}`}>
                    {statusLabel[status]}
                  </button>
                ))}
                {saving === item.id && <span className="text-xs text-secondary">Menyimpan...</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
