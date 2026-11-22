import Link from "next/link";
import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeatureCard } from "@/components/FeatureCard";

// FR-DASH-03: the dashboard is the entry point to all three features and shows
// a real summary of the user's own recent work, not placeholder text.
export default async function DashboardPage() {
  const state = await session();
  if (state.status === "anonymous") redirect("/login");
  // The layout already renders the connection notice; render nothing here so the
  // page never throws a database error just because the link went down.
  if (state.status === "unreachable") return null;
  const user = state.user;

  const [analysis, roadmap, documents] = await Promise.all([
    prisma.careerAnalysis.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, createdAt: true, uploadedFile: { select: { originalFilename: true } }, recommendations: { orderBy: { rank: "asc" }, take: 1, select: { matchScore: true, jobPosition: { select: { title: true } } } } } }),
    prisma.roadmap.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, targetJobPosition: { select: { title: true } }, items: { select: { status: true } } } }),
    prisma.cvDocument.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true, status: true } }),
  ]);


  return (
    <section className="p-6 md:p-10">
      <div className="mb-10">
        <p className="text-sm font-medium text-primary">Workspace kamu</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-secondary">Pilih fitur untuk mulai mengembangkan kariermu.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <FeatureCard title="AI Career Analysis" description="Pahami profil dan temukan arah karier yang sesuai dengan potensimu." href="/dashboard/analysis" color="bg-blue" icon="✦" ready />
        <FeatureCard title="AI Career Roadmap" description="Susun langkah belajar yang lebih terarah untuk mencapai target karier." href="/dashboard/roadmap" color="bg-mint" icon="↗" ready />
        <FeatureCard title="AI CV Builder" description="Buat CV profesional yang merepresentasikan pengalaman terbaikmu." href="/dashboard/cv-builder" color="bg-yellow" icon="▤" ready />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold">Aktivitas terbaru</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            {analysis ? (
              <>
                <span>Career Analysis · {analysis.uploadedFile?.originalFilename ?? "CV tanpa nama"} · {analysis.status}{analysis.recommendations[0] ? ` · ${analysis.recommendations[0].jobPosition.title} (${analysis.recommendations[0].matchScore}%)` : ""}</span>
                <Link className="font-semibold text-deep" href={analysis.status === "completed" ? `/dashboard/analysis/${analysis.id}` : "/dashboard/analysis"}>Buka</Link>
              </>
            ) : <span className="text-secondary">Belum ada analisis. <Link className="font-semibold text-deep" href="/dashboard/analysis">Mulai Career Analysis</Link>.</span>}
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            {roadmap ? (
              <>
                <span>Roadmap {roadmap.targetJobPosition.title} · {roadmap.items.filter(item => item.status === "completed").length}/{roadmap.items.length} aktivitas selesai</span>
                <Link className="font-semibold text-deep" href={`/dashboard/roadmap/${roadmap.id}`}>Buka</Link>
              </>
            ) : <span className="text-secondary">Belum ada roadmap. <Link className="font-semibold text-deep" href="/dashboard/roadmap">Susun roadmap</Link>.</span>}
          </li>
          <li className="flex flex-wrap items-center justify-between gap-3">
            {documents ? (
              <>
                <span>CV &quot;{documents.title}&quot; · {documents.status}</span>
                <Link className="font-semibold text-deep" href={`/dashboard/cv-builder/${documents.id}`}>Buka</Link>
              </>
            ) : <span className="text-secondary">Belum ada CV. <Link className="font-semibold text-deep" href="/dashboard/cv-builder">Buat CV</Link>.</span>}
          </li>
        </ul>
      </div>
    </section>
  );
}
