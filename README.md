# FOLIO

Platform pengembangan karier dengan tiga fitur AI: **Career Analysis**,
**Career Roadmap**, dan **CV Builder**. Next.js 15 + TypeScript + Tailwind,
Prisma, Supabase PostgreSQL, serta LLM melalui server-side service.

Status: Fase 1–3 selesai dan diuji end-to-end secara lokal. Rincian bukti audit
ada di [`AUDIT.md`](./AUDIT.md).

## Ringkasan fitur

| Fitur | Halaman | Ringkas |
| --- | --- | --- |
| AI Career Analysis | `/dashboard/analysis` | Unggah PDF/DOCX → ekstraksi profil → koreksi manual → rekomendasi berbasis katalog + career insight (XAI). |
| AI Career Roadmap | `/dashboard/roadmap` | Pilih bidang, posisi target, durasi (1/3/6/12 bulan), jam belajar (5/10/20) → skill gap + rencana per minggu + progres. |
| AI CV Builder | `/dashboard/cv-builder` | Form manual lengkap → 2 template → editor + urutan bagian → pratinjau → ekspor PDF privat. |
| Akun & Privasi | `/dashboard/settings` | Ringkasan data dan penghapusan akun beserta file di storage. |

## Menjalankan lokal

1. Buat project Supabase, lalu salin **Transaction pooler** (port 6543) sebagai
   `DATABASE_URL` dan **Direct connection** (port 5432) sebagai `DIRECT_URL` dari
   tombol **Connect**. URL-encode password jika mengandung karakter khusus.
2. Salin `.env.example` menjadi `.env`, isi kedua URL, `AUTH_SECRET` (≥32 karakter
   acak), kredensial LLM, dan kredensial Supabase Storage.
3. `npm ci`, lalu `npx.cmd prisma validate` dan `npx.cmd prisma generate`.
4. Siapkan tabel. **Jika tabel FOLIO belum ada**, jalankan
   `npx.cmd prisma migrate deploy`. **Jika tabel sudah dibuat lewat
   `supabase/schema.sql`**, jangan jalankan `migrate deploy`/`migrate dev`; lihat
   bagian *Migration* di bawah.
5. Isi katalog dan template: `npm.cmd run catalog:seed` lalu
   `npm.cmd run templates:seed`. Keduanya idempotent dan aman diulang.
6. Buat bucket `folio-cvs` di Supabase Storage dan pastikan **private**; server
   menolak bucket publik.
7. Jalankan `npm.cmd run dev`, buka `http://localhost:3000`.

PowerShell yang memblokir `npm.ps1` perlu memakai `npm.cmd`/`npx.cmd`.

## Environment variables

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Pooler Supabase `:6543`. **Harus** memuat `?pgbouncer=true&connection_limit=1` agar Prisma tidak memakai prepared statement yang ditolak PgBouncer. |
| `DIRECT_URL` | ya | Host pooler pada **port 5432 (Session mode)**, dipakai `prisma migrate`. Bisa juga `db.<ref>.supabase.co:5432` bila jaringannya punya IPv6. |
| `AUTH_SECRET` | ya | Minimal 32 karakter acak; JWT sesi ditandatangani dengan ini. |
| `LLM_API_KEY` / `LLM_MODEL` / `LLM_BASE_URL` | ya | Provider OpenAI-compatible. Key hanya di server. |
| `LLM_TIMEOUT_MS` | tidak | Default `120000` (10000–300000). |
| `LLM_MAX_OUTPUT_TOKENS` | tidak | Default `8192` (1024–16384). |
| `LLM_DISABLE_THINKING` | tidak | Default `true`. Set `false` hanya bila provider menolak parameter reasoning. |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | ya | Untuk Storage privat. Jangan pernah dikirim ke browser. |
| `SUPABASE_STORAGE_BUCKET` | tidak | Default `folio-cvs`. |
| `CV_MAX_BYTES` | tidak | Default `5242880` (5 MB), maksimum 20 MB. |

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm.cmd run dev` | Server pengembangan. |
| `npm.cmd run build` / `start` | Build dan jalankan produksi lokal. |
| `npm.cmd run lint` / `typecheck` / `test` | Validasi; `test` menjalankan 32 tes. |
| `npm.cmd run catalog:seed` | Isi 35 posisi junior + 175 kriteria (idempotent). |
| `npm.cmd run templates:seed` | Isi 2 template CV (idempotent). |
| `npm.cmd run llm:check` | Uji pipeline LLM Fase 2 (ekstraksi + insight), hanya metadata. |
| `npm.cmd run phase3:check` | Uji pipeline LLM Fase 3 (roadmap + bantuan CV). |
| `npm.cmd run storage:check` | Pastikan bucket privat, round-trip, dan hapus berhasil. |
| `npm.cmd run e2e:check -- <pdf> <docx>` | Alur penuh lewat HTTP terhadap `next start`. |
| `npm.cmd run db:status` | Status migration lewat Session pooler (IPv4, gratis). |
| `npm.cmd run db:migrate` | Terapkan migration lewat Session pooler. |
| `npm.cmd run db:baseline` | Tandai migration awal sebagai applied (sekali saja). |

## API

Semua endpoint privat memeriksa sesi dan kepemilikan resource.

```
POST   /api/auth/register | /api/auth/login | /api/auth/logout
GET    /api/me                      DELETE /api/me        (hapus akun + file)
POST   /api/career-analysis/upload
GET    /api/career-analysis         GET/PATCH/POST /api/career-analysis/:id
GET    /api/job-categories          GET /api/job-positions?categoryId=
GET    /api/roadmaps                POST /api/roadmaps
GET    /api/roadmaps/:id            DELETE /api/roadmaps/:id
PATCH  /api/roadmaps/:id/items/:itemId
GET    /api/cv-templates
GET    /api/cv-documents            POST /api/cv-documents
GET    /api/cv-documents/:id        PATCH/DELETE /api/cv-documents/:id
POST   /api/cv-documents/:id/generate-content
POST   /api/cv-documents/:id/export GET /api/cv-documents/:id/download
```

## Cara kerja AI (dan batasnya)

**Career Analysis.** Teks CV diekstrak lokal (pdf-parse/mammoth), lalu LLM
mengubahnya menjadi profil berschema. Setiap klaim wajib punya `evidence` yang
benar-benar ada di teks CV; klaim tanpa bukti dibuang, bukan diparafrasa. Skor
adalah weighted matching deterministik terhadap kriteria katalog:

```
score = sum(componentScore × componentWeight) / sum(availableComponentWeight)
bobot: skill 0.65, experience 0.15, project 0.12, education 0.08
```

Saat ini hanya komponen `skill` yang dinilai karena katalog belum punya kriteria
eksplisit untuk tiga komponen lain — komponen yang tidak tersedia **dikeluarkan**
dari pembagi, bukan diberi nilai nol. Sinonim skill (`Tableau` → Data
Visualization, `Pandas` → Python, `MySQL` → SQL) dipetakan ke satu kriteria
katalog agar tetap tertelusur. Posisi hanya direkomendasikan jika skor ≥ 15 **dan**
ada skill inti (bobot ≥ 3) yang cocok, sehingga posisi yang hanya cocok di “Git”
tidak muncul. Skor adalah indikator kecocokan terhadap katalog, **bukan**
probabilitas diterima kerja.

**Career Roadmap.** Skill gap dihitung deterministik: `owned` (ada di daftar
skill), `improve` (muncul di pengalaman/proyek/sertifikasi tapi belum sebagai
skill), `missing` (tidak ditemukan). Prioritas = bobot × 10 + bonus kriteria wajib.
Kapasitas = durasi × jam/minggu; kompetensi hanya dimasukkan bila jamnya cukup,
sisanya dilaporkan **belum tercakup** beserta saran memperpanjang durasi. LLM
hanya menulis konten untuk slot minggu yang sudah ditentukan sistem, dan jumlah
minggu divalidasi harus sama.

**CV Builder.** LLM hanya menerima fakta yang diketik pengguna. Sebelum hasil
dipakai, `groundingCheck()` menolak teks yang memuat angka atau entitas baru di
luar fakta tersebut, dan UI meminta pengguna memeriksa saran sebelum menerapkannya.
Ekspor PDF dibuat dengan pdfkit lalu disimpan di bucket privat; unduhan melewati
route ber-auth (`Content-Disposition: inline`, tanpa URL publik).

## Migration

**Jangan upgrade ke Supabase Pro.** Host direct `db.<ref>.supabase.co` memang
IPv6-only di free tier, tetapi host **pooler** yang sama sudah dual-stack. Pakai
**Session pooler (port 5432)** — gratis, dan mendukung prepared statement yang
dibutuhkan Prisma migration:

```powershell
npm.cmd run db:status     # cek status migration
npm.cmd run db:migrate    # terapkan migration yang belum jalan
npm.cmd run db:baseline   # tandai migration awal sebagai applied (sekali saja)
```

Ketiga perintah memakai `scripts/with-session-pooler.mjs` yang menurunkan URL
Session pooler dari `DATABASE_URL` (port `6543` → `5432`, parameter
`pgbouncer`/`connection_limit` dibuang). Password dimasking di output.

> Status saat ini: baseline `20261121000000_init` **sudah tercatat**
> (`Database schema is up to date!`), sehingga `migrate deploy` melaporkan
> "No pending migrations to apply". Untuk perubahan schema berikutnya, buat
> migration dengan `npx.cmd prisma migrate dev --name <nama>` pada database
> pengembangan, lalu terapkan dengan `npm.cmd run db:migrate`.

Detail lengkap ada di [`docs/supabase-connection.md`](./docs/supabase-connection.md).

- `pgbouncer=true` pada `DATABASE_URL` wajib untuk runtime; tanpa itu Prisma
  memakai prepared statement yang ditolak Transaction pooler
  (`prepared statement "s0" already exists`).
- Jangan pernah mengubah `DATABASE_URL` runtime menjadi port 5432: Session mode
  memakai satu koneksi per klien dan cepat menghabiskan batas koneksi free tier.

## Deployment paling sederhana

1. Deploy repo ke Vercel (free tier) atau VPS apa pun yang punya HTTPS.
2. Set semua environment variable dari tabel di atas di dashboard hosting.
   `SUPABASE_SECRET_KEY`, `LLM_API_KEY`, dan `AUTH_SECRET` **hanya** di server.
3. Jalankan `prisma generate` saat build, lalu `prisma migrate deploy` sekali dari
   mesin yang bisa menjangkau direct connection.
4. Pastikan bucket `folio-cvs` private dan tidak ada kebijakan publik.
5. Tidak ada akun cloud berbayar yang dibuat tanpa persetujuan pemilik project.

## Keterbatasan yang diketahui

- Katalog 35 posisi adalah baseline ilustratif, belum divalidasi praktisi industri.
- Semantic/embedding matching belum dipakai; skor murni deterministik dan dapat
  ditelusuri.
- Proses AI berjalan sinkron dalam request; untuk skala produksi perlu queue.
- Baseline migration Prisma belum tercatat karena keterbatasan IPv6 di atas.
- PDF/DOCX hasil uji end-to-end memakai contoh CV pada mesin pengembang; variasi
  format CV yang sangat tidak lazim tetap perlu diuji manual.

## Catatan riwayat fase

- **Fase 1** — fondasi, autentikasi (bcrypt + `auth_sessions` + cookie JWT),
  dashboard, schema 18 tabel di Supabase.
- **Fase 2** — Career Analysis: parser PDF/DOCX, Storage privat, LLM berschema
  dengan grounding, katalog 35 posisi, XAI berbasis perhitungan.
- **Fase 3** — Career Roadmap, CV Builder, halaman Akun & Privasi, dashboard
  dengan riwayat nyata, serta skrip verifikasi
  (`llm:check`, `phase3:check`, `storage:check`, `e2e:check`).

Untuk detail audit dan daftar yang masih terbuka, lihat [`AUDIT.md`](./AUDIT.md).

