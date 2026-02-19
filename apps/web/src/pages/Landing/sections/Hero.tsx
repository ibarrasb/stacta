import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pill } from "../components/ui";

export default function Hero() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/35 px-3 py-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/stacta.png"
              alt="Stacta"
              className="h-8 w-8 rounded-lg border border-white/15 bg-black/25 object-contain p-1"
              draggable={false}
            />
            <div className="rounded-xl border border-amber-200/30 bg-gradient-to-br from-amber-300/35 to-orange-500/30 px-2 py-1 text-[10px] font-black tracking-[0.15em] text-amber-100">
              STACTA
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="secondary"
              className="h-9 rounded-xl border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/18 sm:h-10 sm:text-sm"
            >
              <Link to="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="h-9 rounded-xl bg-white px-3 text-xs text-black hover:bg-white/90 sm:h-10 sm:text-sm">
              <Link to="/sign-up">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 pt-24 sm:pt-28">
        <section className="relative pt-10 md:pt-14">
          <div className="pointer-events-none absolute -left-12 top-24 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-8 h-52 w-52 rounded-full bg-teal-400/15 blur-3xl" />

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
                Smell has taste.
                <br />
                <span className="bg-[linear-gradient(90deg,rgba(252,211,77,1),rgba(251,146,60,1),rgba(45,212,191,1))] bg-clip-text text-transparent">
                  Build yours.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-base text-white/72 md:text-lg">
                A focused fragrance network for collectors. Track your rotation, set your Top 3, and discover bottles
                through people you actually trust.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <Pill>Collection tracking</Pill>
                <Pill>Top 3</Pill>
                <Pill>Social discovery</Pill>
              </div>
            </div>

            <div className="grid place-items-center">
              <img
                src="/stacta.png"
                alt="Stacta logo"
                className="h-52 w-52 object-contain opacity-95 drop-shadow-[0_22px_42px_rgba(0,0,0,0.5)] md:h-72 md:w-72"
                draggable={false}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
