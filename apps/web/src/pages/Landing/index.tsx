import Hero from "./sections/Hero";
import Features from "./sections/Features";
import HowItWorks from "./sections/HowItWorks";
import FAQ from "./sections/FAQ";
import CTA from "./sections/CTA";
import { AuraBackground } from "./components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white">
      <AuraBackground />
      <Hero />
      <main className="mx-auto max-w-6xl px-4">
        <Features />
        <HowItWorks />
        <FAQ />
        <CTA />
      </main>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-white/60">© {new Date().getFullYear()} Stacta</div>
          <div className="text-sm text-white/60">Taste-first fragrance discovery.</div>
        </div>
      </footer>
    </div>
  );
}
