"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { connectionMessage } from "@/lib/ui-messages";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    // A dropped connection rejects fetch before any response exists. Without
    // this the button stayed on "Memproses..." forever with no explanation.
    let response: Response;
    try {
      response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    } catch {
      setError(connectionMessage); setLoading(false); return;
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? "Permintaan gagal. Coba lagi."); setLoading(false); return; }
    // Carry the new cookie into the navigation, otherwise the dashboard can be
    // rendered with the pre-login cache and bounce straight back here.
    router.replace("/dashboard"); router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12"><div className="w-full max-w-md"><div className="mb-8 flex justify-center"><Logo /></div><div className="rounded-2xl border border-border bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">{mode === "login" ? "Selamat datang kembali" : "Buat akun FOLIO"}</h1><p className="mt-2 text-sm text-secondary">{mode === "login" ? "Masuk untuk melanjutkan perjalanan kariermu." : "Mulai perjalanan pengembangan kariermu."}</p><form onSubmit={submit} className="mt-7 space-y-4">{mode === "register" && <label className="block text-sm font-medium">Nama lengkap<input name="name" required className="mt-2 w-full rounded-lg border-border" placeholder="Nama kamu" /></label>}<label className="block text-sm font-medium">Email<input name="email" type="email" required className="mt-2 w-full rounded-lg border-border" placeholder="nama@email.com" /></label><label className="block text-sm font-medium">Password<input name="password" type="password" minLength={8} required className="mt-2 w-full rounded-lg border-border" placeholder="Minimal 8 karakter" /></label>{error && <p className="rounded-lg bg-pink p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-deep disabled:opacity-60">{loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}</button></form><p className="mt-6 text-center text-sm text-secondary">{mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}<Link className="font-semibold text-deep hover:text-primary" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Daftar" : "Masuk"}</Link></p></div></div></main>;
}
