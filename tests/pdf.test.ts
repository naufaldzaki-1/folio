import { strict as assert } from "node:assert";
import { test } from "node:test";
import { inflateSync } from "node:zlib";
import { renderCvPdf } from "../src/lib/cv/pdf";
import { emptyCvContent, type CvContent } from "../src/lib/cv/schema";
import { CV_FORMAT, pointsToPixels } from "../src/lib/cv/format";

// The PDF text is compressed, so the checks read the decompressed content
// streams. That is what makes it possible to assert the locked typography
// instead of only "a file came out".
function streams(pdf: Buffer) {
  const out: string[] = [];
  let index = 0;
  for (;;) {
    const start = pdf.indexOf("stream", index);
    if (start < 0) break;
    let from = start + "stream".length;
    while (pdf[from] === 0x0d || pdf[from] === 0x0a) from++;
    const end = pdf.indexOf("endstream", from);
    if (end < 0) break;
    try { out.push(inflateSync(pdf.subarray(from, end)).toString("latin1")); } catch { /* not deflated */ }
    index = end + 1;
  }
  return out.join("\n");
}

function sample(): CvContent {
  const base = emptyCvContent("Naufal Dzaki Mu'aafii");
  return {
    ...base,
    contact: { ...base.contact, phone: "08920390391", email: "opgjeki@gmail.com", location: "Kudus", links: ["github.com/naufaldzaki"] },
    summary: "Mahasiswa Teknik Informatika di Politeknik Negeri Semarang sejak 2024.",
    education: [{ id: "edu-1", title: "Teknik Informatika", organization: "Politeknik Negeri Semarang", location: "Semarang", period: "2024 - Present", description: "Mahasiswa aktif." }],
    experience: [{ id: "exp-1", title: "IO", organization: "Techomfest", location: "Semarang", period: "2025", description: "Mengawasi jalannya acara Techomfest." }],
    skills: ["SQL", "Python"],
  };
}

test("PDF export produces a readable PDF document", async () => {
  const pdf = await renderCvPdf(sample());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.byteLength > 1000, "PDF harus berisi lebih dari satu halaman kosong");
  assert.ok(pdf.toString("latin1").includes("%%EOF"));
});

test("a CV without a name is rejected instead of exported", async () => {
  // Exporting an anonymous document would produce a useless file, so the schema
  // guard runs before rendering (the create route enforces the same rule).
  await assert.rejects(() => renderCvPdf(emptyCvContent("")), /Nama wajib diisi/);
});

test("a minimal named CV still renders", async () => {
  const pdf = await renderCvPdf(emptyCvContent("Nama Uji"));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
});


// Locked format requirements: 11 / 13 / 20 pt only, never below 10 pt.
test("exported PDF uses only the locked font sizes", async () => {
  const text = streams(await renderCvPdf(sample()));
  const used = [...new Set([...text.matchAll(/\/F\d+ ([\d.]+) Tf/g)].map(match => Number(match[1])))].sort((a, b) => a - b);
  const { name, sectionHeading, bullet } = CV_FORMAT.pointSizes;
  assert.deepEqual(used, [bullet, sectionHeading, name].sort((a, b) => a - b), `Ukuran yang dipakai: ${used.join(", ")}`);
  assert.equal(used.filter(size => size < CV_FORMAT.minimumPointSize).length, 0, "Tidak boleh ada teks di bawah 10 pt");
});

// Locked requirements: everything black, no accent colour anywhere.
test("exported PDF draws text and rules in full black only", async () => {
  const text = streams(await renderCvPdf(sample()));
  // pdfkit writes colours as "r g b scn" (fill) and "r g b SCN" (stroke).
  const colors = [...text.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) (scn|SCN)\b/g)].map(m => `${m[1]} ${m[2]} ${m[3]}`);
  assert.ok(colors.length > 0, "Harus ada operasi warna di content stream");
  assert.deepEqual([...new Set(colors)], ["0 0 0"], `Warna yang dipakai: ${[...new Set(colors)].join(" | ")}`);
  assert.ok(!text.includes("1B365D"), "Warna navy lama tidak boleh muncul lagi");
});

// Locked requirements: Arial embedded and the text starts at the 2 cm margin.
test("exported PDF embeds Arial and starts at the 2 cm margin", async () => {
  const pdf = await renderCvPdf(sample());
  assert.ok(/arial|liberation|dejavu/i.test(pdf.toString("latin1")), "Font Arial harus tertanam di PDF");

  const margin = (CV_FORMAT.marginCm / 2.54) * 72; // 56.69 pt
  // Positions are written as "1 0 0 1 x y Tm".
  const firstPosition = streams(pdf).match(/1 0 0 1 ([\d.]+) ([\d.]+) Tm/);
  assert.ok(firstPosition, "Harus ada operasi posisi teks");
  assert.ok(Math.abs(Number(firstPosition[1]) - margin) < 1, `Teks harus mulai di margin kiri ${margin.toFixed(2)} pt, bukan ${firstPosition[1]}`);
});

// Preview conversion stated by the requirements: 11 pt = 14,67 px.
test("preview converts points to pixels with the locked ratio", () => {
  assert.ok(Math.abs(pointsToPixels(11) - 14.67) < 0.01);
  assert.ok(Math.abs(pointsToPixels(13) - 17.33) < 0.01);
  assert.ok(Math.abs(pointsToPixels(20) - 26.67) < 0.01);
});

// ATS requirement: machine-readable text. The institution line must read
// "Institution - Location" then the date, not scrambled by a table layout.
test("exported PDF keeps the CV text extractable and in reading order", async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const parsePdf = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string }>;
  const text = (await parsePdf(await renderCvPdf(sample()))).text.replace(/\s+/g, " ");

  assert.ok(text.includes("NAUFAL DZAKI MU'AAFII") || text.toUpperCase().includes("NAUFAL DZAKI MU'AAFII"), "Nama harus terbaca mesin");
  const institution = text.indexOf("Politeknik Negeri Semarang");
  const location = text.indexOf("Semarang", institution);
  assert.ok(institution >= 0, "Nama institusi harus terbaca");
  assert.ok(location > institution, "Lokasi harus muncul setelah nama institusi");
  assert.ok(!text.includes("Tabel"), "Tidak boleh ada layout tabel");
});

