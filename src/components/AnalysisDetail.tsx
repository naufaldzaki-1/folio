"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-fetch";

type Explanation = { matchedSkills: { name: string; weight: number }[]; notFoundInCv: { name: string; weight: number }[]; evidence: { value: string; evidence: string }[]; limitations: string[] };
type Analysis = { status: string; uploadedFile?: { originalFilename: string } | null; recommendations: { id: string; matchScore: number; rank: number; jobPosition: { title: string }; explanationJson: Explanation }[]; insights: { profileSummary: string; strengthsJson: string[]; improvementAreasJson: string[]; careerPotentialJson: string[]; cvEvaluationJson: string[] }[] };
export function AnalysisDetail({ id }: { id: string }) {
  const [item, setItem] = useState<Analysis | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    requestJson<{ analysis: Analysis }>(`/api/career-analysis/${encodeURIComponent(id)}`)
      .then(value => setItem(value.analysis))
      .catch(e => setError(e instanceof Error ? e.message : "Analisis tidak dapat dimuat."))
      .finally(() => setLoading(false));
  }, [id]);
  if (loading) return <p className="p-10">Memuat hasil...</p>;
  if (error) return <p role="alert" className="p-10">{error}</p>;
  if (!item) return <p className="p-10">Analisis tidak ditemukan.</p>;
  const insight = item.insights[0];
  return <section className="mx-auto max-w-5xl space-y-6 p-6 md:p-10"><Link href="/dashboard/analysis" className="text-deep">← Kembali ke riwayat</Link><h1 className="text-3xl font-bold">Hasil Career Analysis</h1><p className="text-secondary">{item.uploadedFile?.originalFilename} · Status: {item.status}</p><p className="rounded-xl bg-yellow p-4 text-sm">Skor adalah indikator kecocokan terhadap kriteria katalog, BUKAN probabilitas diterima kerja. Belum ditemukan dalam CV ≠ tidak memiliki skill.</p>
    {item.status !== "completed" && <p className="rounded-xl bg-white p-5">{item.status === "pending" ? "Profil belum dikonfirmasi. Buka halaman upload untuk membuat analisis baru." : item.status === "failed" ? "Analisis gagal. Kembali ke halaman analisis dan periksa profil untuk mencoba lagi." : "Analisis sedang diproses; muat ulang halaman nanti."}</p>}
    {item.recommendations.map(r => <article key={r.id} className="rounded-2xl border border-border bg-white p-6"><div className="flex justify-between"><h2 className="text-xl font-semibold">{r.rank}. {r.jobPosition.title}</h2><strong className="text-2xl text-deep">{r.matchScore}%</strong></div><h3 className="mt-5 font-semibold">Skill yang cocok</h3><p className="text-sm text-secondary">{r.explanationJson.matchedSkills.map(x => `${x.name} (bobot ${x.weight})`).join(", ") || "Belum ditemukan dalam CV"}</p><h3 className="mt-4 font-semibold">Belum ditemukan dalam CV</h3><p className="text-sm text-secondary">{r.explanationJson.notFoundInCv.map(x => `${x.name} (bobot ${x.weight})`).join(", ") || "Tidak ada"}</p><h3 className="mt-4 font-semibold">Bukti CV</h3><ul className="list-inside list-disc text-sm text-secondary">{r.explanationJson.evidence.map((x, i) => <li key={i}>{x.value}: “{x.evidence}”</li>)}</ul><p className="mt-4 text-sm text-secondary">{r.explanationJson.limitations.join(" ")}</p></article>)}
    {insight && <article className="rounded-2xl border border-border bg-white p-6"><h2 className="text-xl font-semibold">Career insight</h2><p className="mt-3">{insight.profileSummary}</p>{([["Kekuatan", insight.strengthsJson], ["Area pengembangan", insight.improvementAreasJson], ["Potensi", insight.careerPotentialJson], ["Evaluasi CV", insight.cvEvaluationJson]] as const).map(([label, entries]) => <div key={label} className="mt-4"><h3 className="font-semibold">{label}</h3><ul className="list-inside list-disc text-sm text-secondary">{entries.map((entry, i) => <li key={i}>{entry}</li>)}</ul></div>)}</article>}
  </section>;
}