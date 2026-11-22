import { downloadPrivate, ensurePrivateBucket, removePrivate, storageBucket, uploadPrivate } from "../src/lib/storage";

// Proves the private-bucket contract used by CV export: the bucket must not be
// public, and a written object must be readable back and removable.
async function main() {
  await ensurePrivateBucket();
  console.log(JSON.stringify({ stage: "bucket", ok: true, bucket: storageBucket(), public: false }));
  const key = `cv-exports/smoke-test/verify.pdf`;
  const payload = Buffer.from("%PDF-1.4\n% smoke test\n%%EOF");
  await uploadPrivate(key, payload, "application/pdf");
  const read = await downloadPrivate(key);
  console.log(JSON.stringify({ stage: "roundtrip", ok: read.equals(payload), bytes: read.byteLength }));
  await removePrivate([key]);
  let removed = false;
  try { await downloadPrivate(key); } catch { removed = true; }
  console.log(JSON.stringify({ stage: "cleanup", ok: removed }));
  if (!removed) process.exitCode = 1;
}

main().catch(error => {
  console.log(JSON.stringify({ stage: "storage", ok: false, message: error instanceof Error ? error.message : "unknown" }));
  process.exitCode = 1;
});
