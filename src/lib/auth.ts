import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ConfigError, ConnectionError } from "@/lib/error-message";
import { classifySession, type SessionOutcome } from "@/lib/session";
const COOKIE = "folio_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value || value === "replace-with-a-long-random-secret" || value.length < 32) {
    throw new ConfigError("AUTH_SECRET harus diisi dengan secret acak minimal 32 karakter.");
  }
  return new TextEncoder().encode(value);
};
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex"); const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  await prisma.authSession.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const signed = await new SignJWT({ token }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret());
  (await cookies()).set(COOKIE, signed, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: expiresAt, path: "/" });
}

// A cookie whose token is missing or forged means "not logged in", so null is
// the right answer there. A missing AUTH_SECRET is a server problem and is
// rethrown: reporting it as a logout would hide the real cause.
async function readToken(value: string) {
  try {
    const { payload } = await jwtVerify(value, secret());
    return typeof payload.token === "string" ? payload.token : null;
  } catch (error) {
    if (error instanceof ConfigError) throw error;
    return null;
  }
}

export async function getCurrentUser() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const token = await readToken(value);
  if (!token) return null;

  let row;
  try {
    row = await prisma.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  } catch {
    // The cookie is still valid — the database is what failed. Swallowing this
    // turned every dropped connection into a silent logout: the visitor was
    // redirected to /login even though the session had not expired.
    throw new ConnectionError("Sesi tidak bisa diverifikasi karena database tidak terjangkau.");
  }
  if (!row || row.expiresAt < new Date()) return null;
  return row.user;
}

// The dashboard layout and the page below it both need the user. Memoising
// keeps that to one session query per request instead of one per component.
export const currentUser = cache(getCurrentUser);
export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// Three outcomes, not two: see src/lib/session.ts for why this matters.
export { classifySession };
export type { SessionOutcome };
export type SessionState = SessionOutcome<SessionUser>;

export const session = cache((): Promise<SessionState> => classifySession(getCurrentUser));

export async function destroySession() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (value) { try { const { payload } = await jwtVerify(value, secret()); if (typeof payload.token === "string") await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(payload.token) } }); } catch { /* invalid cookie */ } }
  (await cookies()).delete(COOKIE);
}
