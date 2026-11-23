import Link from "next/link";
import { DashboardMockup } from "@/components/landing/DashboardMockup";

const highlights = [
  { title: "AI Career Analysis", body: "Upload CV, dapat rekomendasi posisi junior.", tone: "bg-blue" },
  { title: "AI Career Roadmap", body: "Langkah belajar mingguan sesuai target.", tone: "bg-mint" },
  { title: "AI CV Builder", body: "CV ATS siap unduh PDF.", tone: "bg-yellow" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Soft lavender glow — one blurred shape, not a purple-blue gradient mesh. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[42rem] max-w-full -translate-x-1/2 rounded-full bg-lavender blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Pengembangan karier yang lebih terarah
          </span>

          <h1 className="mt-7 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Bangun masa depan kariermu bersama <span className="text-primary">FOLIO</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-secondary sm:text-lg">
            Platform pengembangan karier yang membantu kamu memahami potensi, merencanakan langkah, dan tampil lebih percaya diri.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="w-full rounded-xl bg-primary px-7 py-3.5 text-center font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-deep hover:shadow-lg sm:w-auto">
              Mulai Perjalananmu
            </Link>
            <a href="#cara-kerja" className="w-full rounded-xl border border-border bg-white px-7 py-3.5 text-center font-semibold text-text transition-colors hover:border-primary hover:text-deep sm:w-auto">
              Lihat Cara Kerja
            </a>
          </div>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
          {highlights.map(item => (
            <li key={item.title} className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${item.tone}`} aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-sm bg-deep/60" />
              </span>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-secondary">{item.body}</p>
            </li>
          ))}
        </ul>

        <DashboardMockup />
      </div>
    </section>
  );
}
