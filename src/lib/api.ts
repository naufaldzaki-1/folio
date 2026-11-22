import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { ConnectionError, publicMessage } from "@/lib/error-message";

// 401 means "log in again", so it must never be used for an outage: the browser
// would throw away a still-valid session over a dropped connection.
export async function authenticated(): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }> {
  try {
    const user = await getCurrentUser();
    return user ? { user } : { error: NextResponse.json({ error: "Silakan login dahulu." }, { status: 401 }) };
  } catch (error) {
    if (error instanceof ConnectionError) {
      return { error: NextResponse.json({ error: publicMessage(error) }, { status: 503 }) };
    }
    throw error;
  }
}

export function failureResponse(error: unknown) {
  console.error("API request failed:", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: publicMessage(error) }, { status: 400 });
}

