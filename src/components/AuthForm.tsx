"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { connectionMessage } from "@/lib/ui-messages";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Baca query parameter saat halaman dimuat
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("verified") === "1") {
        setNotice("Email berhasil diverifikasi! Akun kamu sudah aktif. Silakan masukkan password untuk masuk.");
      }
      const prefillEmail = params.get("email");
      if (prefillEmail) {
        setEmailInput(prefillEmail);
      }
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    setUnverifiedEmail("");

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const email = (data.email as string)?.trim().toLowerCase();

    // Validasi format email di frontend
    const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || !emailPattern.test(email)) {
      setError("Format email tidak valid. Masukkan format yang benar (contoh: nama@gmail.com).");
      setLoading(false);
      return;
    }

    let response: Response;
    try {
      response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      setError(connectionMessage);
      setLoading(false);
      return;
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 403 && result.unverified) {
        setUnverifiedEmail(result.email || email);
      }
      setError(result.error ?? "Permintaan gagal. Coba lagi.");
      setLoading(false);
      return;
    }

    if (mode === "register") {
      // Pendaftaran berhasil -> Arahkan pengguna ke halaman Verifikasi OTP
      router.replace(`/verify-otp?email=${encodeURIComponent(email)}`);
      return;
    }

    // Login sukses: masuk ke dashboard
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Selamat datang kembali" : "Buat akun FOLIO"}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            {mode === "login"
              ? "Masuk untuk melanjutkan perjalanan kariermu."
              : "Mulai perjalanan pengembangan kariermu."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "register" && (
              <label className="block text-sm font-medium">
                Nama lengkap
                <input
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  className="mt-2 w-full rounded-lg border-border"
                  placeholder="Nama kamu"
                />
              </label>
            )}

            <label className="block text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="mt-2 w-full rounded-lg border-border"
                placeholder="nama@email.com"
              />
            </label>

            <label className="block text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="mt-2 w-full rounded-lg border-border"
                placeholder="Minimal 8 karakter"
              />
            </label>

            {notice && (
              <div role="status" className="rounded-lg bg-mint p-3 text-sm text-green-900 border border-green-200">
                {notice}
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-lg bg-pink p-3 text-sm text-red-700 border border-red-200 space-y-2">
                <p>{error}</p>
                {unverifiedEmail && (
                  <Link
                    href={`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}`}
                    className="inline-block text-xs font-semibold text-deep underline hover:text-primary"
                  >
                    Verifikasi Kode OTP Sekarang →
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-deep disabled:opacity-60 transition-colors"
            >
              {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-secondary">
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <Link
              className="font-semibold text-deep hover:text-primary transition-colors"
              href={mode === "login" ? "/register" : "/login"}
            >
              {mode === "login" ? "Daftar" : "Masuk"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
