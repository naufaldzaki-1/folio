#!/usr/bin/env node
// Runs a Prisma CLI command against the Session pooler (port 5432).
//
// Why: Supabase free tier exposes the direct host db.<ref>.supabase.co as
// IPv6-only, so `prisma migrate` fails with P1001 on IPv4-only networks. The
// shared pooler host is dual-stack and accepts Session mode on port 5432, which
// supports the prepared statements Prisma migrations need — no Pro upgrade.
//
// Usage: node scripts/with-session-pooler.mjs migrate status
import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi. Salin .env.example menjadi .env dahulu.");
  process.exit(1);
}

let parsed;
try { parsed = new URL(databaseUrl); } catch {
  console.error("DATABASE_URL bukan URL yang valid.");
  process.exit(1);
}

// Session mode shares the host with the transaction pooler; only the port and
// the pooler-specific query parameters change.
const sessionUrl = new URL(parsed.toString());
sessionUrl.port = "5432";
sessionUrl.searchParams.delete("pgbouncer");
sessionUrl.searchParams.delete("connection_limit");
sessionUrl.searchParams.delete("pool_timeout");
sessionUrl.searchParams.delete("connect_timeout");

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Sebutkan perintah Prisma, contoh: node scripts/with-session-pooler.mjs migrate status");
  process.exit(1);
}

const target = sessionUrl.toString();
console.log(`[session-pooler] ${target.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@")}`);

const child = spawn("npx", ["prisma", ...args], {
  stdio: "inherit",
  shell: true,
  // Both URLs point at Session mode: DATABASE_URL drives runtime queries in the
  // CLI, DIRECT_URL drives schema operations.
  env: { ...process.env, DATABASE_URL: target, DIRECT_URL: target },
});
child.on("exit", code => process.exit(code ?? 1));
