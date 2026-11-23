import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // Khusus Gmail, gunakan service: "gmail" agar koneksi TLS/port dikelola otomatis dan stabil
  if (host?.includes("gmail") || user.includes("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

export async function sendOtpEmail(toEmail: string, name: string, otpCode: string): Promise<boolean> {
  const transporter = getTransporter();
  const user = process.env.SMTP_USER;
  const rawFrom = process.env.SMTP_FROM?.replace(/^"+|"+$/g, "").trim();
  const from = rawFrom || (user ? { name: "FOLIO Career", address: user } : { name: "FOLIO Career", address: "no-reply@folio-career.com" });

  if (!transporter) {
    console.error("[Email] Pengiriman gagal: Konfigurasi SMTP belum lengkap di environment.");
    throw new Error("Layanan pengiriman email belum dikonfigurasi di server.");
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verifikasi Akun FOLIO</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAFAFC; color: #18181B; margin: 0; padding: 24px; }
        .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E4E4E7; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .logo { font-size: 24px; font-weight: 800; color: #6D28D9; text-align: center; margin-bottom: 24px; }
        .logo-icon { display: inline-block; width: 36px; height: 36px; line-height: 36px; background: #8B5CF6; color: #ffffff; border-radius: 8px; margin-right: 8px; text-align: center; }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 12px; text-align: center; }
        .greeting { font-size: 14px; color: #71717A; margin-bottom: 24px; text-align: center; }
        .otp-box { background: #F5F3FF; border: 2px dashed #8B5CF6; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6D28D9; font-family: 'Courier New', monospace; }
        .expiry-note { font-size: 13px; color: #71717A; text-align: center; margin-top: 8px; }
        .warning { font-size: 12px; color: #A1A1AA; text-align: center; margin-top: 24px; border-top: 1px solid #E4E4E7; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <span class="logo-icon">F</span> FOLIO
        </div>
        <div class="title">Verifikasi Akun Kamu</div>
        <div class="greeting">Halo ${name}, terima kasih telah mendaftar di FOLIO. Gunakan kode verifikasi di bawah ini untuk mengaktifkan akunmu:</div>
        
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-note">Berlaku selama <strong>10 menit</strong></div>
        </div>

        <div class="warning">
          Jangan berikan kode ini kepada siapa pun. Jika kamu tidak merasa mendaftar di FOLIO, abaikan email ini.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from,
      to: toEmail,
      subject: `${otpCode} adalah kode verifikasi FOLIO kamu`,
      html: htmlContent,
    });
    return true;
  } catch (error: unknown) {
    // A catch binding is `unknown`, not `any`: narrow it before reading .message
    // so a non-Error throw (e.g. a rejected string) cannot crash the log line.
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Email] Gagal mengirim email OTP via SMTP:", detail || "Error pengiriman email");
    throw new Error("Gagal mengirim email verifikasi ke alamat email kamu. Pastikan alamat email benar.");
  }
}
