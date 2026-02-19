type LoadingSpinnerProps = {
  label?: string;
  className?: string;
  sizeClassName?: string;
};

export default function LoadingSpinner({
  label = "Loading",
  className = "",
  sizeClassName = "h-8 w-8",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-white/80 ${className}`.trim()}>
      <div
        className={`${sizeClassName} animate-spin rounded-full border-2 border-white/25 border-t-white`.trim()}
        role="status"
        aria-label={label}
      />
      <div className="text-sm">{label}</div>
    </div>
  );
}
