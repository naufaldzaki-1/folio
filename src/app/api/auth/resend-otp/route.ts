import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAndSendOtp } from "@/lib/otp";
import { validateEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const rawEmail = body?.email ?? "";

  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: emailCheck.email },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: "Email ini sudah terverifikasi. Silakan langsung masuk.", alreadyVerified: true },
      { status: 400 }
    );
  }

  const otpResult = await createAndSendOtp(user);
  if (!otpResult.success) {
    const isRateLimited = otpResult.error?.includes("Mohon tunggu");
    return NextResponse.json({ error: otpResult.error }, { status: isRateLimited ? 429 : 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Kode OTP baru telah berhasil dikirimkan ke email kamu.",
  });
}
