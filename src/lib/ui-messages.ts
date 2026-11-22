// User-facing strings needed by both server and client code. Kept out of
// error-message.ts because that module imports zod and the LLM client, which
// must not end up in a browser bundle.
export const connectionMessage = "Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.";
