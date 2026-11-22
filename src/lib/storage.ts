import { createClient } from "@supabase/supabase-js";
import { ConfigError } from "@/lib/error-message";

// All user documents (uploaded CVs and generated CV PDFs) live in one private
// bucket, separated by key prefix. The server never exposes a public URL; bytes
// are streamed through an authenticated route instead.
export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "folio-cvs";
}

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ConfigError("Konfigurasi Supabase Storage belum lengkap.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function privateStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ConfigError("Konfigurasi Supabase Storage belum lengkap.");
  return storageClient().storage.from(storageBucket());
}

// A public bucket would expose every user's CV to the internet, so an existing
// public bucket is treated as a configuration error instead of being used.
export async function ensurePrivateBucket() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ConfigError("Konfigurasi Supabase Storage belum lengkap.");
  const { data, error } = await storageClient().storage.getBucket(storageBucket());
  if (error || !data || data.public) throw new ConfigError("Bucket CV tidak tersedia atau bukan private. Periksa konfigurasi Storage.");
}

export async function uploadPrivate(path: string, body: Buffer, contentType: string) {
  const { error } = await privateStorage().upload(path, body, { contentType, upsert: true });
  if (error) throw new Error("Gagal menyimpan dokumen secara privat.");
}

export async function downloadPrivate(path: string) {
  const { data, error } = await privateStorage().download(path);
  if (error || !data) throw new Error("Dokumen tidak ditemukan di storage.");
  return Buffer.from(await data.arrayBuffer());
}

export async function removePrivate(paths: string[]) {
  if (!paths.length) return;
  await privateStorage().remove(paths).catch(() => undefined);
}
