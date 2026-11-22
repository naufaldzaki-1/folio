"use client";
import { useId, useState } from "react";
import { cvSectionLabels, type CvContent, type CvEntry, type CvSectionKey } from "@/lib/cv/schema";

const entrySections: CvSectionKey[] = ["education", "experience", "projects", "certifications", "organizations"];

const hints: Record<string, string> = {
  education: "Satu entri per jenjang pendidikan. Isi nama institusi dan tahun.",
  experience: "Satu entri per posisi atau magang. Tulis tugas nyata, bukan klaim.",
  projects: "Satu entri per proyek. Sebutkan peranmu, teknologi yang dipakai, dan hasilnya.",
  certifications: "Satu entri per sertifikat atau pelatihan yang pernah kamu ikuti.",
  organizations: "Satu entri per organisasi, kepanitiaan, atau kegiatan tambahan.",
};

// Placeholder yang spesifik untuk setiap section dan kolom
const placeholders: Record<string, { title: string; organization: string; period: string; description: string }> = {
  education: {
    title: "Jurusan / Program studi",
    organization: "Nama universitas / sekolah",
    period: "Agt 2021 - Jun 2025",
    description: "Deskripsi singkat, prestasi, atau kegiatan akademik yang relevan",
  },
  experience: {
    title: "Jabatan / Posisi",
    organization: "Nama perusahaan / instansi",
    period: "Jan 2024 - Des 2024",
    description: "Tugas dan pencapaian yang kamu lakukan (satu poin per baris)",
  },
  projects: {
    title: "Nama proyek",
    organization: "Konteks / platform (GitHub, perusahaan, kampus)",
    period: "Mar 2024",
    description: "Deskripsi proyek: peranmu, teknologi yang dipakai, dan hasil/dampaknya",
  },
  certifications: {
    title: "Nama sertifikat / pelatihan",
    organization: "Penerbit / penyelenggara",
    period: "2024",
    description: "Topik yang dipelajari atau keahlian yang didapat (opsional)",
  },
  organizations: {
    title: "Jabatan / peran",
    organization: "Nama organisasi / komunitas",
    period: "2022 - 2023",
    description: "Tanggung jawab dan pencapaian selama aktif (opsional)",
  },
};

// Skills input pakai local state supaya user bisa mengetik dengan bebas
// (termasuk spasi), dan baru diparsing saat blur.
function SkillsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
}) {
  const [raw, setRaw] = useState(value.join(", "));

  function commit(text: string) {
    const parsed = text
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 60);
    onChange(parsed);
    // Normalise display after blur
    setRaw(parsed.join(", "));
  }

  return (
    <input
      className="mt-1 w-full rounded-lg border-border"
      placeholder="SQL, Python, Tableau, Figma"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={e => commit(e.target.value)}
    />
  );
}

// Shared by the builder and the editor, so both paths validate the same shape.
export function CvFormFields({ content, onChange }: { content: CvContent; onChange: (next: CvContent) => void }) {
  const fieldId = useId();
  const patch = (update: Partial<CvContent>) => onChange({ ...content, ...update });

  function setEntries(key: CvSectionKey, entries: CvEntry[]) {
    onChange({ ...content, [key]: entries } as CvContent);
  }
  function patchEntry(key: CvSectionKey, id: string, update: Partial<CvEntry>) {
    setEntries(key, (content[key] as CvEntry[]).map(item => item.id === id ? { ...item, ...update } : item));
  }
  function addEntry(key: CvSectionKey) {
    const entries = content[key] as CvEntry[];
    setEntries(key, [...entries, { id: `${key}-${Date.now()}`, title: "", organization: "", period: "", description: "" }]);
  }

  return (
    <div className="mt-5 space-y-8">
      {/* ── Kontak ── */}
      <fieldset className="rounded-xl border border-border p-4">
        <legend className="px-1 font-semibold text-sm">Kontak</legend>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium">Nama lengkap
            <input id={`${fieldId}-name`} className="mt-1 w-full rounded-lg border-border" maxLength={120}
              placeholder="Nama Lengkap" value={content.contact.fullName}
              onChange={e => patch({ contact: { ...content.contact, fullName: e.target.value } })} />
          </label>
          <label className="block text-sm font-medium">Headline / posisi yang dituju
            <input className="mt-1 w-full rounded-lg border-border" maxLength={140}
              placeholder="Data Analyst | SQL, Python" value={content.contact.headline}
              onChange={e => patch({ contact: { ...content.contact, headline: e.target.value } })} />
          </label>
          <label className="block text-sm font-medium">Email
            <input className="mt-1 w-full rounded-lg border-border" maxLength={160}
              placeholder="nama@email.com" value={content.contact.email}
              onChange={e => patch({ contact: { ...content.contact, email: e.target.value } })} />
          </label>
          <label className="block text-sm font-medium">Nomor telepon
            <input className="mt-1 w-full rounded-lg border-border" maxLength={40}
              placeholder="08xx-xxxx-xxxx" value={content.contact.phone}
              onChange={e => patch({ contact: { ...content.contact, phone: e.target.value } })} />
          </label>
          <label className="block text-sm font-medium">Kota / lokasi
            <input className="mt-1 w-full rounded-lg border-border" maxLength={120}
              placeholder="Jakarta, Indonesia" value={content.contact.location}
              onChange={e => patch({ contact: { ...content.contact, location: e.target.value } })} />
          </label>
          <label className="block text-sm font-medium">Tautan profil
            <input className="mt-1 w-full rounded-lg border-border"
              placeholder="linkedin.com/in/nama, github.com/nama"
              value={content.contact.links.join(", ")}
              onChange={e => patch({ contact: { ...content.contact, links: e.target.value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 5) } })} />
            <span className="mt-0.5 block text-xs text-secondary">Pisahkan dengan koma. Maks. 5 tautan.</span>
          </label>
        </div>
      </fieldset>

      {/* ── Ringkasan ── */}
      <label className="block text-sm font-medium">{cvSectionLabels.summary}
        <span className="ml-1 font-normal text-secondary">(opsional)</span>
        <textarea rows={4} className="mt-1 w-full rounded-lg border-border" maxLength={1400}
          placeholder="Deskripsi singkat tentang dirimu: latar belakang, keahlian utama, dan tujuan karier."
          value={content.summary} onChange={e => patch({ summary: e.target.value })} />
      </label>

      {/* ── Keterampilan ── */}
      <label className="block text-sm font-medium">{cvSectionLabels.skills}
        <span className="ml-1 font-normal text-secondary">(pisahkan dengan koma)</span>
        <SkillsInput value={content.skills} onChange={skills => patch({ skills })} />
        <span className="mt-0.5 block text-xs text-secondary">Contoh: SQL, Python, Tableau, Figma, Microsoft Excel</span>
      </label>

      {/* ── Entry Sections ── */}
      {entrySections.map(key => {
        const entries = content[key] as CvEntry[];
        const ph = placeholders[key];
        return (
          <div key={key} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{cvSectionLabels[key]}</h3>
                <p className="mt-0.5 text-xs text-secondary">{hints[key]}</p>
              </div>
              <button type="button"
                className="shrink-0 rounded-lg bg-lavender px-3 py-1.5 text-sm font-medium text-deep hover:bg-primary hover:text-white transition-colors"
                onClick={() => addEntry(key)}>
                + Tambah
              </button>
            </div>

            {entries.length === 0 && (
              <p className="mt-3 text-xs text-secondary italic">Belum ada entri. Klik &quot;+ Tambah&quot; untuk menambah.</p>
            )}

            <div className="mt-3 space-y-4">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-secondary">Entri {idx + 1}</span>
                    <button type="button"
                      className="text-xs text-secondary hover:text-red-500 transition-colors"
                      onClick={() => setEntries(key, entries.filter(item => item.id !== entry.id))}>
                      Hapus entri
                    </button>
                  </div>

                  {/* Row 1: Title dan Organization */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-secondary">
                      {key === "education" ? "Jurusan / Program studi" :
                       key === "experience" ? "Jabatan / Posisi" :
                       key === "projects" ? "Nama proyek" :
                       key === "certifications" ? "Nama sertifikat" :
                       "Jabatan / Peran"}
                      <input
                        className="mt-1 w-full rounded-lg border-border text-sm text-text"
                        placeholder={ph.title}
                        maxLength={160}
                        value={entry.title}
                        onChange={e => patchEntry(key, entry.id, { title: e.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-medium text-secondary">
                      {key === "education" ? "Nama universitas / sekolah" :
                       key === "experience" ? "Nama perusahaan / instansi" :
                       key === "projects" ? "Konteks / platform" :
                       key === "certifications" ? "Penerbit / penyelenggara" :
                       "Nama organisasi / komunitas"}
                      <input
                        className="mt-1 w-full rounded-lg border-border text-sm text-text"
                        placeholder={ph.organization}
                        maxLength={160}
                        value={entry.organization}
                        onChange={e => patchEntry(key, entry.id, { organization: e.target.value })}
                      />
                    </label>
                  </div>

                  {/* Row 2: Location (printed after the institution) + periode */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block text-xs font-medium text-secondary">
                      Lokasi <span className="font-normal">(opsional)</span>
                      <input
                        className="mt-1 w-full rounded-lg border-border text-sm text-text"
                        placeholder="Jakarta, Indonesia"
                        maxLength={160}
                        value={entry.location ?? ""}
                        onChange={e => patchEntry(key, entry.id, { location: e.target.value })}
                      />
                      <span className="mt-0.5 block text-[11px] font-normal">Tampil setelah nama institusi, dipisah tanda hubung.</span>
                    </label>
                    <label className="block text-xs font-medium text-secondary">
                      Periode / Tahun
                      <input
                        className="mt-1 w-full rounded-lg border-border text-sm text-text"
                        placeholder={ph.period}
                        maxLength={60}
                        value={entry.period}
                        onChange={e => patchEntry(key, entry.id, { period: e.target.value })}
                      />
                    </label>
                  </div>

                  {/* Row 3: Deskripsi */}
                  <label className="block text-xs font-medium text-secondary">
                    Deskripsi
                    <span className="ml-1 font-normal">(tiap poin baru = baris baru)</span>
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border-border text-sm text-text"
                      placeholder={ph.description}
                      maxLength={1200}
                      value={entry.description}
                      onChange={e => patchEntry(key, entry.id, { description: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
