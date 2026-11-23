"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export function OtpVerificationForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ambil email dari query string di browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryEmail = params.get("email");
      if (queryEmail) {
        setEmail(queryEmail);
      }
    }
  }, []);

  // Timer countdown 60 detik untuk kirim ulang OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus pada input pertama saat komponen dimuat
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    // Ambil hanya digit terakhir jika ada input
    const cleanChar = value.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = cleanChar;
    setDigits(nextDigits);
    setError("");

    // Auto-focus ke input berikutnya jika diisi
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      // Jika kotak kosong dan tekan backspace, pindah ke kotak sebelumnya
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasteData[i] || "";
    }
    setDigits(nextDigits);
    setError("");

    // Focus ke input terakhir yang terisi atau yang ke-6
    const nextFocusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const otpCode = digits.join("");
    if (otpCode.length !== 6) {
      setError("Masukkan 6 digit kode OTP secara lengkap.");
      return;
    }

    if (!email) {
      setError("Email tidak ditemukan. Silakan lakukan pendaftaran ulang.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Verifikasi gagal. Periksa kembali kode OTP kamu.");
        setLoading(false);
        return;
      }

      setNotice("Verifikasi berhasil! Mengalihkan ke halaman masuk...");
      setTimeout(() => {
        router.replace(`/login?verified=1&email=${encodeURIComponent(email)}`);
      }, 1000);
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet kamu.");
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    if (!email) {
      setError("Email tidak ditemukan. Silakan daftar ulang.");
      return;
    }

    setResending(true);
    setError("");
    setNotice("");

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Gagal mengirim ulang kode OTP.");
        setResending(false);
        return;
      }

      setNotice("Kode OTP baru telah dikirimkan ke email kamu.");
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Gagal menghubungi server saat meminta kirim ulang.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-2xl text-primary">
              ✉️
            </div>
            <h1 className="text-2xl font-bold">Verifikasi Email Kamu</h1>
            <p className="mt-2 text-sm text-secondary">
              Kami telah mengirimkan 6 digit kode OTP ke:
            </p>
            <p className="mt-1 font-semibold text-text break-all">
              {email || "email kamu"}
            </p>
            <p className="mt-1 text-xs text-secondary">
              Kode berlaku selama <strong>10 menit</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6">
            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleDigitChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border border-border text-center text-xl sm:text-2xl font-bold text-text focus:border-primary focus:ring-2 focus:ring-lavender transition-all outline-none bg-background"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            {notice && (
              <div role="status" className="rounded-lg bg-mint p-3 text-sm text-green-900 border border-green-200 text-center">
                {notice}
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-lg bg-pink p-3 text-sm text-red-700 border border-red-200 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || digits.join("").length !== 6}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-deep disabled:opacity-60 transition-colors shadow-sm"
            >
              {loading ? "Memverifikasi..." : "Verifikasi & Aktifkan Akun"}
            </button>
          </form>

          {/* Bagian Kirim Ulang OTP */}
          <div className="mt-6 text-center text-sm border-t border-border pt-5">
            <p className="text-secondary">
              Tidak menerima kode OTP?
            </p>
            {cooldown > 0 ? (
              <p className="mt-1.5 text-xs text-secondary">
                Kirim ulang tersedia dalam <span className="font-semibold text-deep">{cooldown} detik</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="mt-1.5 font-semibold text-deep hover:text-primary transition-colors disabled:opacity-50"
              >
                {resending ? "Mengirim ulang..." : "Kirim Ulang Kode OTP"}
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-secondary">
            Salah memasukkan email?{" "}
            <Link className="font-semibold text-deep hover:text-primary transition-colors" href="/register">
              Daftar ulang
            </Link>
            {" · "}
            <Link className="font-semibold text-deep hover:text-primary transition-colors" href="/login">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
