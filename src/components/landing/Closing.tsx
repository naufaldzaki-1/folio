import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/landing/Reveal";

export function Closing() {
  return (
    <>
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <div className="rounded-3xl bg-lavender px-6 py-12 text-center sm:px-12 sm:py-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Siap mulai perjalanan kariermu?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-secondary">
                Mulai dari satu CV. Analisis, roadmap, dan CV ATS-nya menyusul dalam satu alur.
              </p>
              <Link href="/register" className="mt-8 inline-block rounded-xl bg-primary px-8 py-3.5 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-deep hover:shadow-lg">
                Mulai Sekarang
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <Logo />
            <p className="text-sm text-secondary">FOLIO — AI-Powered Career Development Platform</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Link href="/login" className="font-medium text-secondary transition-colors hover:text-text">Masuk</Link>
            <Link href="/register" className="font-medium text-secondary transition-colors hover:text-text">Daftar</Link>
            <span className="text-secondary">© 2026 FOLIO</span>
          </div>
        </div>
      </footer>
    </>
  );
}
