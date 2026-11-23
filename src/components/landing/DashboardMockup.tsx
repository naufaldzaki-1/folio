// The product mockup. Built from divs + SVG only: no screenshots, no external
// images. Everything is labelled "Contoh tampilan" so nobody mistakes the sample
// numbers for a real analysis result.

// Fixed sample data — not computed, not from AI.
const sampleScores = [
  { title: "Frontend Developer", score: 82, tone: "bg-primary" },
  { title: "Data Analyst", score: 64, tone: "bg-deep" },
];
const sampleSteps = [
  { label: "Dasar JavaScript", done: true },
  { label: "React & komponen", done: true },
  { label: "Pengujian frontend", done: false },
];

export function DashboardMockup() {
  return (
    <div id="contoh-hasil" className="mx-auto mt-14 max-w-5xl scroll-mt-28">
      <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-secondary">Contoh tampilan</p>

      <div className="rounded-3xl border border-border bg-white p-3 shadow-xl shadow-text/5 sm:p-4">
        {/* Fake window chrome so it reads as a product shot. */}
        <div className="mb-3 flex items-center gap-1.5 px-1" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 h-4 flex-1 rounded-md bg-background" />
        </div>

        <div className="grid gap-3 rounded-2xl bg-background p-3 sm:grid-cols-3 sm:p-4">
          <RecommendationCard />
          <RoadmapCard />
          <CvPreviewCard />
        </div>
      </div>
    </div>
  );
}

function RecommendationCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Rekomendasi posisi</p>
        <span className="rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-deep">Contoh</span>
      </div>

      <div className="mt-3 space-y-3">
        {sampleScores.map((row, index) => (
          <div key={row.title}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-sm font-semibold text-deep">{row.score}%</p>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className={`folio-fill h-full rounded-full ${row.tone}`}
                style={{ width: `${row.score}%`, "--folio-delay": `${index * 160}ms` } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-5 text-secondary">
        Angka contoh. Skor sebenarnya dihitung dari kecocokan skill CV dengan katalog posisi.
      </p>
    </div>
  );
}

function RoadmapCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Roadmap</p>
      <p className="mt-2 text-sm font-semibold">Frontend Developer</p>
      <p className="text-[11px] text-secondary">3 bulan · 10 jam/minggu</p>

      <ul className="mt-3 space-y-2">
        {sampleSteps.map(step => (
          <li key={step.label} className="flex items-start gap-2 text-[11px] leading-5">
            <span
              aria-hidden="true"
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-mint text-deep" : "border border-border bg-white text-transparent"}`}
            >
              <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M4 10.5l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={step.done ? "text-secondary line-through" : "text-text"}>{step.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
        <div className="folio-fill h-full w-2/3 rounded-full bg-primary" style={{ "--folio-delay": "220ms" } as React.CSSProperties} />
      </div>
    </div>
  );
}

function CvPreviewCard() {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:col-span-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">CV ATS · contoh</p>
        <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-secondary">PDF</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
        {/* Skeleton page: grey bars standing in for text lines. */}
        <div className="rounded-xl border border-border p-3" aria-hidden="true">
          <div className="h-2.5 w-24 rounded bg-text/80" />
          <div className="mt-1.5 h-1.5 w-36 rounded bg-border" />
          <div className="mt-4 space-y-1.5">
            {[92, 84, 88, 70].map((width, index) => (
              <div key={index} className="h-1.5 rounded bg-border" style={{ width: `${width}%` }} />
            ))}
          </div>
          <div className="mt-3 h-1.5 w-20 rounded bg-text/50" />
          <div className="mt-2 space-y-1.5">
            {[80, 74].map((width, index) => (
              <div key={index} className="h-1.5 rounded bg-border" style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2">
          <div className="rounded-lg bg-mint px-3 py-2 text-[11px] leading-5 text-deep">Template ATS, satu kolom</div>
          <div className="rounded-lg bg-blue px-3 py-2 text-[11px] leading-5 text-deep">Font dan margin sesuai ketentuan</div>
          <div className="rounded-lg bg-lavender px-3 py-2 text-[11px] leading-5 text-deep">Tersimpan privat</div>
        </div>
      </div>
    </div>
  );
}
