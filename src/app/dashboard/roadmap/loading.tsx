// Instant feedback for a client transition. Kept at segment level: a loading
// boundary above the layout would turn every page into a streamed shell.
export default function Loading() {
  return (
    <section className="p-6 md:p-10" aria-busy="true" aria-live="polite">
      <p className="text-sm text-secondary">Memuat halaman...</p>
      <div className="mt-6 space-y-4">
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
        <div className="h-32 animate-pulse rounded-2xl border border-border bg-white" />
      </div>
    </section>
  );
}
