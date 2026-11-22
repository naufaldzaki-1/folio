import { ZodError } from "zod";
import { AiError } from "@/lib/career/llm";
import { connectionMessage } from "@/lib/ui-messages";

// Only messages written by our own validation layer are echoed back. Anything
// else (Prisma, provider errors, stack details) becomes a generic message so a
// failure never leaks schema or infrastructure details to the browser.
// Keep this list in sync with the wording used in src/lib/**; a missing prefix
// silently turns a helpful message into "Periksa file dan konfigurasi server".
const safePattern = /^(Katalog pekerjaan|Skill belum|File kosong|File terlalu besar|Hanya file PDF|PDF tidak valid|DOCX tidak valid|CV kosong|File rusak|Bucket CV|Gagal menyimpan (CV|dokumen)|Konfigurasi (LLM|Supabase)|LLM_|Posisi target|Bidang|Durasi|Waktu belajar|Kapasitas|Roadmap|Template CV|Dokumen CV|CV belum|Isi CV belum|Isi dulu|Isi keterampilan|Belum ada posisi katalog|Data CV|Profil|Analisis|Dokumen tidak ditemukan)/;

export const genericMessage = "Proses gagal. Periksa file dan konfigurasi server, lalu coba lagi.";

// Server misconfiguration is never actionable for the visitor and can reveal
// environment details, so it is always reported as the generic message.
export class ConfigError extends Error {}

// Raised when the database cannot be reached. It is deliberately distinct from
// "you are logged out": the session cookie is still valid, we just could not
// verify it, so the visitor must not be bounced to /login.
export class ConnectionError extends Error {}

// Pure so the wording can be tested without booting Next.js or Prisma.
export function publicMessage(error: unknown) {
  if (error instanceof ConfigError) return genericMessage;
  if (error instanceof ConnectionError) return connectionMessage;
  // Zod messages are written for users (e.g. "Nama wajib diisi."), so the first
  // issue is surfaced instead of a generic message.
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
  if (error instanceof AiError) return error.message;
  if (error instanceof Error && safePattern.test(error.message)) return error.message;
  return genericMessage;
}
