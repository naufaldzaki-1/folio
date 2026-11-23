import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";

// Bento grid: three cards of different sizes, one column on phones.
const features = [
  {
    title: "AI Career Analysis",
    body: "Unggah CV PDF atau DOCX, lalu profilmu diekstrak dan dicocokkan ke katalog posisi junior. Setiap penjelasan rekomendasi berasal dari perhitungan matching, bukan karangan AI.",
    href: "/dashboard/analysis",
    span: "lg:col-span-3",
    tone: "bg-blue",
    icon: "search",
  },
  {
    title: "AI Career Roadmap",
    body: "Pilih posisi target, durasi 1/3/6/12 bulan, dan jam belajar 5/10/20 per minggu. Roadmap menampilkan skill yang sudah dimiliki, yang perlu ditingkatkan, dan yang belum ada.",
    href: "/dashboard/roadmap",
    span: "lg:col-span-3",
    tone: "bg-mint",
    icon: "route",
  },
  {
    title: "AI CV Builder",
    body: "Isi form manual, lalu AI hanya membantu merapikan ringkasan dan deskripsi dari fakta yang kamu tulis. AI tidak mengarang pengalaman. Template ATS, ekspor PDF.",
    href: "/dashboard/cv-builder",
    span: "lg:col-span-2",
    tone: "bg-yellow",
    icon: "doc",
  },
];

export function Features() {
  return (
    <section id="fitur" className="scroll-mt-24 border-y border-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Fitur</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Tiga fitur, satu perjalanan karier
          </h2>
          <p className="mt-4 max-w-2xl text-secondary">
            Ketiganya saling terhubung: hasil analisis menjadi dasar roadmap, dan roadmap menjadi bahan CV.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-6">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 90} className={feature.span}>
              <article className="group flex h-full flex-col rounded-3xl border border-border bg-background p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-8">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.tone} text-deep`}>
                  <FeatureIcon name={feature.icon} />
                </span>
                <h3 className="mt-6 text-xl font-bold">{feature.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-secondary">{feature.body}</p>
                <Link href={feature.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-deep transition-colors group-hover:text-primary">
                  Coba di Dashboard
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Inline SVG keeps the page dependency-free.
function FeatureIcon({ name }: { name: string }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...shared}>
      {name === "search" && <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>}
      {name === "route" && <><path d="M5 18a3 3 0 100-6 3 3 0 000 6z" /><path d="M19 12a3 3 0 100-6 3 3 0 000 6z" /><path d="M8 9h5a3 3 0 013 3" /></>}
      {name === "doc" && <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M10 12h5M10 16h5" /></>}
    </svg>
  );
}
