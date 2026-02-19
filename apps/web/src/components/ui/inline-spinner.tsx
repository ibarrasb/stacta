type InlineSpinnerProps = {
  className?: string;
};

export default function InlineSpinner({ className = "" }: InlineSpinnerProps) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/35 border-t-current ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
