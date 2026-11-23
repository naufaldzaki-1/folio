import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
  const rawEmail = body?.email ?? "";
  const password = body?.password ?? "";

  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: emailCheck.email } });
  if (!user) {
    return NextResponse.json(
      { error: "Email belum terdaftar. Silakan buat akun terlebih dahulu melalui menu Daftar." },
      { status: 401 }
    );
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Password yang kamu masukkan salah." }, { status: 401 });
  }

  // Cek apakah email sudah diverifikasi dengan OTP
  if (!user.emailVerified) {
    return NextResponse.json(
      {
        error: "Email kamu belum diverifikasi. Silakan masukkan kode OTP terlebih dahulu untuk mengaktifkan akun.",
        unverified: true,
        email: user.email,
      },
      { status: 403 }
    );
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
