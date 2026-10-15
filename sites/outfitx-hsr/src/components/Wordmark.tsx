export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-[0.18em] ${className}`}>
      OUTFIT
      <span className="relative inline-block">
        X
        <span aria-hidden className="absolute -right-[0.22em] bottom-[0.08em] h-[0.16em] w-[0.16em] bg-signal" />
      </span>
    </span>
  );
}
