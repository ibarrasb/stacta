export default function GlobalBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-50 overflow-hidden">
      <div className="absolute inset-0 bg-[#07080c]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(255,167,69,0.22),transparent_38%),radial-gradient(circle_at_82%_14%,rgba(0,209,178,0.18),transparent_42%),radial-gradient(circle_at_52%_78%,rgba(250,102,149,0.14),transparent_45%)]" />
      <div
        className="absolute -left-28 top-1/3 h-[24rem] w-[24rem] rounded-full bg-gradient-to-br from-amber-300/25 via-orange-400/20 to-rose-400/10 blur-3xl"
        style={{ animation: "stacta-float-a 18s ease-in-out infinite" }}
      />
      <div
        className="absolute -right-24 top-16 h-[20rem] w-[20rem] rounded-full bg-gradient-to-br from-teal-300/25 via-cyan-400/18 to-blue-500/10 blur-3xl"
        style={{ animation: "stacta-float-b 16s ease-in-out infinite" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(3,3,6,0.22),rgba(3,3,6,0.72))]" />
      <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(rgba(255,255,255,0.6)_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
    </div>
  );
}
