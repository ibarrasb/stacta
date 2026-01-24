export default function GlobalBackground() {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-50">
        {/* solid base (always covers) */}
        <div className="absolute inset-0 bg-[#07070b]" />
  
        {/* subtle lift so it doesn't look flat */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06),transparent_55%)]" />
  
        {/* very soft vignette (prevents “band” perception on some displays) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.05),rgba(0,0,0,0.45))]" />
  
        {/* optional tiny noise (helps with gradient banding) */}
        <div className="absolute inset-0 opacity-[0.06] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22120%22 height=%22120%22 filter=%22url(%23n)%22 opacity=%220.22%22/%3E%3C/svg%3E')]" />
      </div>
    );
  }
  