import Hero from "./sections/Hero";
import Features from "./sections/Features";
import CTA from "./sections/CTA";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white stacta-fade-rise">
      <Hero />
      <main className="mx-auto max-w-7xl px-4 pb-10">
        <div className="mt-10 space-y-6 md:mt-14">
          <Features />
          <CTA />
        </div>
      </main>
      <footer className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-10 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-medium text-white/75">© {new Date().getFullYear()} Stacta</div>
          <div className="text-sm text-cyan-100/70">Social fragrance profiles and discovery.</div>
        </div>
      </footer>
    </div>
  );
}
