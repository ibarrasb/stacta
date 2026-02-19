// apps/web/src/pages/Landing/sections/Features.tsx
import { GlassCard } from "../components/ui";

export default function Features() {
  return (
    <section>
      <div className="grid gap-3 md:grid-cols-3">
        <FeatureCard
          title="Connect"
          desc="Follow people whose taste matches yours and build your circle."
        />
        <FeatureCard
          title="Collect"
          desc="Track what you wear and keep your collection readable."
        />
        <FeatureCard
          title="Curate"
          desc="Pick a Top 3 that defines your taste at a glance."
        />
      </div>
    </section>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <GlassCard className="relative overflow-hidden p-5 transition duration-300 hover:-translate-y-0.5 hover:border-amber-200/30">
      <div className="text-xl font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/72">{desc}</div>
    </GlassCard>
  );
}
