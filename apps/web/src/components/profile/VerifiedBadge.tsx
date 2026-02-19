type Props = {
  size?: "sm" | "md";
  className?: string;
};

export default function VerifiedBadge({ size = "md", className }: Props) {
  const dims = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <span
      title="Verified"
      aria-label="Verified"
      className={[
        "inline-flex items-center justify-center",
        dims,
        className ?? "",
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={size === "sm" ? "h-5 w-5" : "h-6 w-6"}>
        <defs>
          <linearGradient id="vbCrestOuter" x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93C5FD" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="vbCrestInner" x1="8" y1="6" x2="16" y2="18" gradientUnits="userSpaceOnUse">
            <stop stopColor="#BFDBFE" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <path
          fill="url(#vbCrestOuter)"
          d="M12 2.4c2.43 1.58 5 2.53 7.58 2.8.2.03.35.19.35.4v6.1c0 4.96-2.65 8.03-7.62 9.83a.89.89 0 0 1-.61 0C6.72 19.77 4.07 16.7 4.07 11.74v-6.1c0-.21.15-.37.35-.4 2.58-.27 5.15-1.22 7.58-2.8Z"
        />
        <path
          fill="url(#vbCrestInner)"
          d="M12 5.15c1.78 1.1 3.72 1.82 5.73 2.11v4.36c0 3.86-1.96 6.15-5.73 7.57-3.77-1.42-5.73-3.71-5.73-7.57V7.26c2.01-.29 3.95-1.01 5.73-2.11Z"
        />
        <path
          fill="#FFFFFF"
          d="m10.23 13.93-1.66-1.66a.9.9 0 0 0-1.27 1.27l2.3 2.3c.35.35.92.35 1.27 0l4.83-4.83a.9.9 0 1 0-1.27-1.27l-4.2 4.19Z"
        />
        <path fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.6" d="M12 5.48c1.7 1 3.52 1.66 5.4 1.96v4.18c0 3.64-1.83 5.8-5.4 7.16-3.56-1.36-5.4-3.52-5.4-7.16V7.44c1.88-.3 3.7-.96 5.4-1.96Z" />
      </svg>
    </span>
  );
}
