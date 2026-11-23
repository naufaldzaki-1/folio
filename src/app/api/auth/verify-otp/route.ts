import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { validateEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; code?: string } | null;
  const rawEmail = body?.email ?? "";
  const code = (body?.code ?? "").trim();

  const emailCheck = validateEmail(rawEmail);
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Kode OTP harus berupa 6 digit angka." }, { status: 400 });
  }

  const result = await verifyOtp(emailCheck.email, code);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Verifikasi gagal." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Email berhasil diverifikasi! Akunmu sekarang sudah aktif. Silakan masuk.",
  });
}
