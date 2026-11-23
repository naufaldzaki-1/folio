import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyFolio } from "@/components/landing/WhyFolio";
import { Closing } from "@/components/landing/Closing";
// Scoped to this route only. Importing it here instead of globals.css keeps the
// dashboard and auth pages untouched.
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: "FOLIO — AI-Powered Career Development Platform",
  description: "Unggah CV, dapat rekomendasi posisi junior, susun roadmap belajar, dan buat CV ATS dalam satu alur.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <WhyFolio />
      <Closing />
    </main>
  );
}
