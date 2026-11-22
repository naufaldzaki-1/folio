import { connectionMessage } from "@/lib/ui-messages";

// A dropped connection rejects fetch before any response exists, and the raw
// reason is "Failed to fetch" — meaningless to a visitor. Every client call goes
// through here so an outage always reads the same way.
export async function requestJson<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(connectionMessage);
  }
  const body = (await response.json().catch(() => null)) as (T & { error?: string; stage?: string }) | null;
  if (!response.ok) {
    // Analysis routes tag failures with the pipeline stage; keeping the prefix
    // means the message still points at the step that broke.
    const prefix = body?.stage ? `[${body.stage}] ` : "";
    throw new Error(prefix + (body?.error ?? "Permintaan gagal. Coba lagi."));
  }
  return (body ?? {}) as T;
}

