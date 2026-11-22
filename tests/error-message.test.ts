import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ZodError, z } from "zod";
import { ConfigError, genericMessage, publicMessage } from "../src/lib/error-message";

// Regression: a roadmap failure whose message began with "Kapasitas" was
// replaced by the generic text, so the screen only said "Periksa file dan
// konfigurasi server" and the real cause stayed invisible.
test("user-facing roadmap messages survive the public filter", () => {
  const capacity = "Kapasitas 20 jam (1 bulan × 5 jam/minggu) belum cukup untuk satu pun dari 3 kompetensi yang kurang.";
  assert.equal(publicMessage(new Error(capacity)), capacity);
  const noGap = "Profil pada cv-salsabila.pdf sudah memenuhi seluruh kompetensi katalog Junior Frontend Developer (5/5 cocok).";
  assert.equal(publicMessage(new Error(noGap)), noGap);
});

test("infrastructure errors still collapse into the generic message", () => {
  assert.equal(publicMessage(new Error("Can't reach database server at db.example.co:5432")), genericMessage);
  assert.equal(publicMessage(new Error("PrismaClientKnownRequestError")), genericMessage);
  assert.equal(publicMessage("not even an error"), genericMessage);
});

test("zod issues are shown verbatim, first issue wins", () => {
  const schema = z.object({ name: z.string().min(1, "Nama wajib diisi.") });
  const result = schema.safeParse({ name: "" });
  assert.equal(result.success, false);
  assert.equal(publicMessage(result.error as ZodError), "Nama wajib diisi.");
});

// The filter is prefix-based, so a new message that does not match a prefix is
// silently swallowed. This scan walks every throw in src/ so that can no longer
// happen without a failing test.
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith(".ts") ? [full] : [];
  });
}

test("every thrown user message in src survives the public filter", () => {
  // AiError bypasses the filter entirely, and ConfigError is intentionally
  // generic, so only plain `new Error("...")` messages depend on safePattern.
  const pattern = /throw new Error\(\s*(?:"([^"]+)"|`([^`$]+)`)/g;
  const leaks: string[] = [];
  let scanned = 0;
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      const message = match[1] ?? match[2];
      scanned++;
      if (publicMessage(new Error(message)) === genericMessage) leaks.push(`${file}: ${message.slice(0, 70)}`);
    }
  }
  assert.ok(scanned > 10, `Hanya ${scanned} pesan terpindai; pola pemindaian mungkin rusak.`);
  assert.deepEqual(leaks, [], `Pesan ini akan tertukar menjadi pesan generik:\n${leaks.join("\n")}`);
});

// Config errors must never leak environment details, even though their text is
// readable — for example AUTH_SECRET length hints.
test("configuration errors never reach the visitor", () => {
  const config = "AUTH_SECRET harus diisi dengan secret acak minimal 32 karakter.";
  assert.equal(publicMessage(new ConfigError(config)), genericMessage);
});

