import Link from "next/link";
import { Logo } from "@/components/Logo";

// Anchor links stay on the page; the two buttons go to the existing auth routes.
const links = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#contoh-hasil", label: "Contoh Hasil" },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <Link href="/" aria-label="FOLIO — beranda" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-8 md:flex">
          {links.map(link => (
            <a key={link.href} href={link.href} className="text-sm font-medium text-secondary transition-colors hover:text-text">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-colors hover:bg-background hover:text-text">
            Masuk
          </Link>
          <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-deep hover:shadow-md">
            Mulai Sekarang
          </Link>
        </div>
      </div>

      {/* Below md the section links cannot fit in the bar, so they get one
          scrollable row of their own instead of a hidden menu. */}
      <nav aria-label="Navigasi bagian" className="flex gap-5 overflow-x-auto border-t border-border px-5 py-2 text-sm md:hidden">
        {links.map(link => (
          <a key={link.href} href={link.href} className="shrink-0 font-medium text-secondary">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
