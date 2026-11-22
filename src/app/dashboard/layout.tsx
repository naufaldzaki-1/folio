import { redirect } from "next/navigation";
import { session } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";
import { ConnectionNotice } from "@/components/ConnectionNotice";

// Only a genuinely anonymous visitor is sent to /login. When the database is
// unreachable we show a retry screen instead: the cookie is still valid, so a
// redirect would wipe the visitor's sense of being logged in over a WiFi blip.
export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const state = await session();
  if (state.status === "anonymous") redirect("/login");
  if (state.status === "unreachable") return <ConnectionNotice />;
  return <DashboardShell name={state.user.name}>{children}</DashboardShell>;
}
