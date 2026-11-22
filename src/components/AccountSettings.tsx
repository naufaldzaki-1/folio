"use client";
import { useEffect, useState } from "react";
import { requestJson } from "@/lib/client-fetch";

type Me = { user: { name: string; email: string; createdAt: string }; counts: { analyses: number; roadmaps: number; documents: number } };

export function AccountSettings() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    requestJson<Me>("/api/me")
      .then(setMe)
      .catch(e => setError(e instanceof Error ? e.message : "Gagal memuat data akun."))
      .finally(() => setLoading(false));
  }, []);

  async function remove() {
    setBusy(true); setError("");
    try {
      await requestJson("/api/me", { method: "DELETE" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus data.");
      setBusy(false);
      return;
    }
    window.location.href = "/";
  }

  if (loading) return <p className="p-10 text-secondary">Memuat data akun...</p>;

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan akun dan privasi</h1>
        <p className="mt-2 text-secondary">Kelola informasi akun dan data yang tersimpan di FOLIO.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-pink p-4 text-sm">{error}</p>}

      {me && (
        <>
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold">Informasi akun</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-secondary">Nama</dt><dd className="font-medium">{me.user.name}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-secondary">Email</dt><dd className="font-medium">{me.user.email}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-secondary">Terdaftar</dt><dd className="font-medium">{new Date(me.user.createdAt).toLocaleDateString("id-ID")}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold">Data yang tersimpan</h2>
            <ul className="mt-4 space-y-2 text-sm text-secondary">
              <li>{me.counts.analyses} hasil Career Analysis</li>
              <li>{me.counts.roadmaps} roadmap</li>
              <li>{me.counts.documents} dokumen CV</li>
            </ul>
            <p className="mt-4 text-sm text-secondary">File CV yang diunggah dan PDF yang diekspor disimpan pada storage privat dan hanya bisa diakses oleh akunmu melalui server FOLIO.</p>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-semibold">Hapus data</h2>
            <p className="mt-2 text-sm text-secondary">Menghapus akun akan menghapus analisis, roadmap, dokumen CV, dan file di storage milik akun ini. Tindakan ini tidak bisa dibatalkan.</p>
            {confirming ? (
              <div className="mt-4 rounded-xl bg-pink p-4">
                <p className="text-sm">Yakin ingin menghapus akun dan seluruh data? Tidak ada cara untuk mengembalikannya.</p>
                <div className="mt-3 flex gap-3">
                  <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={remove}>{busy ? "Menghapus..." : "Ya, hapus semua"}</button>
                  <button className="text-sm text-secondary hover:text-text" onClick={() => setConfirming(false)}>Batal</button>
                </div>
              </div>
            ) : (
              <button className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold" onClick={() => setConfirming(true)}>Hapus akun dan data</button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
