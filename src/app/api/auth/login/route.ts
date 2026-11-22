import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const user = body?.email ? await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } }) : null;
  if (!user || !body?.password || !(await verifyPassword(body.password, user.passwordHash))) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  await createSession(user.id); return NextResponse.json({ ok: true });
}