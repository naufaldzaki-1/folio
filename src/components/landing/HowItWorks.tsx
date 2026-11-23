import { Reveal } from "@/components/landing/Reveal";

const steps = [
  { title: "Upload CV", body: "Unggah CV PDF atau DOCX kamu." },
  { title: "Analisis", body: "Profilmu diekstrak dan dicocokkan ke posisi junior." },
  { title: "Pilih Roadmap", body: "Tentukan posisi target, durasi, dan jam belajar." },
  { title: "Buat CV", body: "Susun CV ATS dan unduh sebagai PDF." },
];

// Dark section: this is the light/dark rhythm the layout asks for. bg-text is the
// existing #18181B token, so no new colour is introduced.
export function HowItWorks() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 bg-text text-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Alur</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Cara Kerja</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-white/60">Empat langkah, masing-masing bisa kamu ulangi kapan saja tanpa kehilangan riwayat.</p>
          </div>
        </Reveal>

        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 100}>
              <li className="relative h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/60">{step.body}</p>
                {/* Connector line between steps on wide screens only. */}
                {index < steps.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-2 top-9 hidden h-px w-4 bg-white/20 lg:block" />
                )}
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
