import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FOLIO — Career Development", description: "FOLIO career development platform" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }