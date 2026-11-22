import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string; email?: string; password?: string } | null;
  const name = body?.name?.trim(); const email = body?.email?.trim().toLowerCase(); const password = body?.password;
  if (!name || !email || !password || password.length < 8) return NextResponse.json({ error: "Nama, email, dan password minimal 8 karakter wajib diisi." }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}