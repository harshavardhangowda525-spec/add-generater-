export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-[0.22em] ${className}`}>
      RK
      <span className="relative inline-block">
        Fitness
        <span aria-hidden className="absolute -right-[0.24em] bottom-[0.08em] h-[0.16em] w-[0.16em] bg-signal" />
      </span>
    </span>
  );
}
