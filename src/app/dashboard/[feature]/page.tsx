import Link from "next/link";
type Props = { params: Promise<{ feature: string }> };
// `/dashboard/analysis`, `/dashboard/roadmap`, and `/dashboard/cv-builder` have
// their own real pages now, so this catch-all only handles unknown segments.
export default async function FeaturePage({ params }: Props) {
  const { feature } = await params;
  return (
    <section className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lavender text-3xl text-primary">?</div>
        <h1 className="mt-6 text-2xl font-bold">Halaman tidak ditemukan</h1>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-secondary">Tidak ada fitur bernama &quot;{feature}&quot;. Gunakan menu di samping untuk membuka Career Analysis, Career Roadmap, atau CV Builder.</p>
        <Link href="/dashboard" className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 font-semibold text-white">Kembali ke dashboard</Link>
      </div>
    </section>
  );
}
