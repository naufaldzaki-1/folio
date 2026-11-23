import { Reveal } from "@/components/landing/Reveal";

// Three honest points. No adoption numbers, no success rates, no invented stats.
const reasons = [
  {
    title: "Rekomendasi khusus posisi junior",
    body: "Katalog awal berisi posisi junior, bukan daftar pekerjaan tanpa batas. Kamu tidak akan ditawari peran senior yang syaratnya jauh di atas profilmu.",
    tone: "bg-blue",
  },
  {
    title: "Skor yang bisa dilacak",
    body: "Persentase kecocokan dihitung dari bobot skill di katalog dan bukti yang ditemukan di CV. Penjelasannya bisa kamu periksa sendiri, bukan teks bebas dari AI.",
    tone: "bg-mint",
  },
  {
    title: "Datamu milikmu",
    body: "CV tersimpan di storage privat dan hanya bisa diakses lewat akunmu. Kamu bisa menghapus akun beserta seluruh datanya kapan saja.",
    tone: "bg-lavender",
  },
];

export function WhyFolio() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Kenapa FOLIO</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Dibuat untuk mahasiswa dan fresh graduate
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {reasons.map((reason, index) => (
            <Reveal key={reason.title} delay={index * 90}>
              <article className="h-full rounded-3xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-text/5 sm:p-8">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${reason.tone}`} aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-deep/70" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{reason.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-secondary">{reason.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
