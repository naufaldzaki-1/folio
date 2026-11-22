import { ConnectionError } from "@/lib/error-message";

// The shape of a logged-in user. Declared structurally so this module stays
// free of Prisma and can be unit tested without a database.
export type SessionUser = { id: string; name: string; email: string };

// Three outcomes, not two. An earlier version returned null for both "no valid
// cookie" and "the database threw", so a dropped WiFi connection looked exactly
// like a logout and every dashboard page redirected to /login. Keeping this
// mapping pure makes the distinction testable without Prisma or Next.

export type SessionOutcome<T> = { status: "ok"; user: T } | { status: "anonymous" } | { status: "unreachable" };

// The concrete outcome for a real user row, so callers can name the union.
export type SessionState = SessionOutcome<SessionUser>;

export async function classifySession<T>(load: () => Promise<T | null>): Promise<SessionOutcome<T>> {
  try {
    const user = await load();
    return user ? { status: "ok", user } : { status: "anonymous" };
  } catch (error) {
    // Only an outage is downgraded. A real bug must still surface as a bug
    // instead of being disguised as "offline".
    if (error instanceof ConnectionError) return { status: "unreachable" };
    throw error;
  }
}
