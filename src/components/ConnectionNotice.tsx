"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { connectionMessage } from "@/lib/ui-messages";

// Shown instead of redirecting to /login when the database cannot be reached.
// The session cookie is still valid, so sending the visitor to the login form
// would look like a logout and force them to type their password again.
export function ConnectionNotice({ detail }: { detail?: string }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Koneksi terputus</h1>
          <p className="mt-3 text-sm text-secondary">{detail ?? connectionMessage}</p>
          <p className="mt-3 text-sm text-secondary">Sesi kamu masih tersimpan, jadi tidak perlu login ulang.</p>
          <button
            onClick={() => { setRetrying(true); router.refresh(); setTimeout(() => setRetrying(false), 1500); }}
            disabled={retrying}
            className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-deep disabled:opacity-60"
          >
            {retrying ? "Mencoba lagi..." : "Coba lagi"}
          </button>
        </div>
      </div>
    </main>
  );
}
