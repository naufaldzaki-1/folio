import mammoth from "mammoth";
// The package root runs demo code when bundled; use the parser implementation directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse/lib/pdf-parse.js") as (buffer: Buffer) => Promise<{ text: string }>;
import { maxUploadBytes } from "./schema";

export async function parseCv(file: File): Promise<{ text: string; buffer: Buffer; mime: string }> {
  if (file.size === 0) throw new Error("File kosong.");
  if (file.size > maxUploadBytes()) throw new Error("File terlalu besar. Maksimal 5 MB secara default.");
  const ext = file.name.toLowerCase().match(/\.(pdf|docx)$/)?.[1];
  const mime = ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (!ext || (file.type && file.type !== mime && file.type !== "application/octet-stream")) throw new Error("Hanya file PDF atau DOCX yang didukung.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (ext === "pdf" && buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("PDF tidak valid.");
  if (ext === "docx" && buffer.subarray(0, 4).toString("hex") !== "504b0304") throw new Error("DOCX tidak valid.");
  try {
    const text = ext === "pdf" ? (await pdf(buffer)).text : (await mammoth.extractRawText({ buffer })).value;
    const normalized = text.replace(/\0/g, "").trim();
    if (normalized.length < 30) throw new Error("CV kosong atau tidak memiliki cukup teks. Untuk PDF scan, gunakan PDF dengan teks yang bisa diseleksi.");
    return { text: normalized, buffer, mime };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CV kosong")) throw error;
    throw new Error("File rusak atau teks gagal diekstrak. Coba PDF/DOCX lain.");
  }
}