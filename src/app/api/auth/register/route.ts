import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateEmail, validateName, validatePassword } from "@/lib/validation";
import { createAndSendOtp } from "@/lib/otp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; email?: string; password?: string } | null;

  const nameCheck = validateName(body?.name ?? "");
  if (!nameCheck.valid) {
    return NextResponse.json({ error: nameCheck.error }, { status: 400 });
  }

  const emailCheck = validateEmail(body?.email ?? "");
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  const passwordCheck = validatePassword(body?.password ?? "");
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const { name } = nameCheck;
  const { email } = emailCheck;
  const password = body!.password!;

  const existing = await prisma.user.findUnique({ where: { email } });
  let targetUser = existing;

  if (existing) {
    if (existing.emailVerified) {
      return NextResponse.json(
        { error: "Email sudah terdaftar dan terverifikasi. Silakan langsung masuk." },
        { status: 409 }
      );
    }
    // Jika ada akun tapi belum terverifikasi, perbarui nama & password barunya
    targetUser = await prisma.user.update({
      where: { id: existing.id },
      data: { name, passwordHash: await hashPassword(password) },
    });
  } else {
    // Buat akun baru dengan status emailVerified = false
    targetUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        emailVerified: false,
      },
    });
  }

  // Buat dan kirim kode OTP ke email
  const otpResult = await createAndSendOtp(targetUser);
  if (!otpResult.success) {
    const isRateLimited = otpResult.error?.includes("Mohon tunggu");
    return NextResponse.json({ error: otpResult.error }, { status: isRateLimited ? 429 : 500 });
  }

  return NextResponse.json({
    ok: true,
    email,
    requiresVerification: true,
    message: "Kode OTP 6 digit telah dikirimkan ke email kamu. Silakan lakukan verifikasi.",
  });
}
