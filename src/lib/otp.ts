import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

// Hash kode OTP dengan SHA-256 agar database tidak menyimpan teks polos
export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Generate 6 digit angka numerik (100000 - 999999)
export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export async function createAndSendOtp(user: { id: string; email: string; name: string }): Promise<{ success: boolean; error?: string }> {
  // Cek apakah ada OTP yang baru saja dibuat (< 60 detik) untuk mencegah spam
  const latestOtp = await prisma.emailOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (latestOtp) {
    const elapsedSeconds = (Date.now() - latestOtp.createdAt.getTime()) / 1000;
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsedSeconds);
      return {
        success: false,
        error: `Mohon tunggu ${waitTime} detik sebelum meminta kode OTP baru.`,
      };
    }
  }

  // Bersihkan OTP lama milik user ini
  await prisma.emailOtp.deleteMany({
    where: { userId: user.id },
  });

  const otpCode = generateOtp();
  const codeHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.emailOtp.create({
    data: {
      userId: user.id,
      email: user.email,
      codeHash,
      expiresAt,
      attempts: 0,
    },
  });

  // Kirim email
  try {
    await sendOtpEmail(user.email, user.name, otpCode);
    return { success: true };
  } catch (err: any) {
    // Jika email gagal terkirim, hanguskan kode OTP agar tidak tertinggal kode gantung
    await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
    return {
      success: false,
      error: err?.message || "Gagal mengirim email verifikasi ke alamat email kamu. Pastikan alamat email benar.",
    };
  }
}

export async function verifyOtp(email: string, inputCode: string): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  if (!cleanCode || cleanCode.length !== 6) {
    return { success: false, error: "Kode OTP harus berupa 6 digit angka." };
  }

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (!user) {
    return { success: false, error: "Pengguna dengan email ini tidak ditemukan." };
  }

  if (user.emailVerified) {
    return { success: true };
  }

  const otpRecord = await prisma.emailOtp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    return { success: false, error: "Kode OTP tidak ditemukan atau belum pernah diminta. Silakan klik kirim ulang." };
  }

  // Cek kedaluwarsa
  if (otpRecord.expiresAt < new Date()) {
    await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
    return { success: false, error: "Kode OTP sudah kedaluwarsa. Silakan minta kode baru." };
  }

  // Cek batas percobaan salah input (maksimal 5 kali)
  if (otpRecord.attempts >= MAX_ATTEMPTS) {
    await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
    return {
      success: false,
      error: "Anda telah salah memasukkan kode sebanyak 5 kali. Kode ini telah dinonaktifkan demi keamanan. Silakan minta kode baru.",
    };
  }

  const hashedInput = hashOtp(cleanCode);
  if (hashedInput !== otpRecord.codeHash) {
    const newAttempts = otpRecord.attempts + 1;
    await prisma.emailOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: newAttempts },
    });

    const remaining = MAX_ATTEMPTS - newAttempts;
    if (remaining <= 0) {
      await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
      return {
        success: false,
        error: "Kode OTP salah. Batas maksimal 5x percobaan telah habis. Silakan minta kode baru.",
      };
    }

    return {
      success: false,
      error: `Kode OTP salah. Sisa percobaan: ${remaining} kali.`,
    };
  }

  // Verifikasi berhasil!
  // Hapus semua OTP user ini dan tandai email_verified = true
  await prisma.emailOtp.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });

  return { success: true };
}
